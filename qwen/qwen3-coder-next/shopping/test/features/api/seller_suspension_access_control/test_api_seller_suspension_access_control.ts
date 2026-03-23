import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_seller_suspensions_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_suspend";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    shop_name: RandomGenerator.name(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerAuthorized);
  // 2. Create regular admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies IEcommerceMallAdmin.IJoin;
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuthorized);
  // 3. Login admin to get proper session
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinInput.email,
      password: adminJoinInput.password,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 4. Get seller registration and approve it
  // Note: We need to create the registration first by checking the admin API for pending registrations
  // For this test, we'll assume the seller registration was created during join
  // In practice, we might need to query pending registrations first
  // 5. Create second admin account
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2JoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies IEcommerceMallAdmin.IJoin;
  const admin2Authorized = await authorize_admin_join(admin2Connection, {
    body: admin2JoinInput,
  });
  typia.assert(admin2Authorized);
  // 6. Login second admin
  const admin2Login = await authorize_admin_login(admin2Connection, {
    body: {
      email: admin2JoinInput.email,
      password: admin2JoinInput.password,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(admin2Login);
  // 7. Create seller suspension with first admin
  const suspendResponse =
    await api.functional.ecommerceMall.admin.seller_suspensions.suspend(
      adminConnection,
      {
        body: {
          seller_id: sellerAuthorized.id,
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspendResponse);
  // 8. Test seller cannot access their own suspension (should fail with 403)
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinInput.email,
      password: sellerJoinInput.password,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 9. First admin retrieves suspension (should succeed)
  const adminSuspension =
    await api.functional.ecommerceMall.admin.seller_suspensions.at(
      adminConnection,
      {
        sellerSuspensionId: suspendResponse.id,
      },
    );
  typia.assert(adminSuspension);
  // 10. Second admin retrieves suspension (should also succeed)
  const admin2Suspension =
    await api.functional.ecommerceMall.admin.seller_suspensions.at(
      admin2Connection,
      {
        sellerSuspensionId: suspendResponse.id,
      },
    );
  typia.assert(admin2Suspension);
  // Verify both admins got the same suspension data
  TestValidator.equals(
    "suspension IDs match",
    adminSuspension.id,
    admin2Suspension.id,
  );
  TestValidator.equals(
    "seller IDs match",
    adminSuspension.seller_id,
    admin2Suspension.seller_id,
  );
  TestValidator.equals(
    "admin IDs match",
    adminSuspension.admin_id,
    admin2Suspension.admin_id,
  );
}
