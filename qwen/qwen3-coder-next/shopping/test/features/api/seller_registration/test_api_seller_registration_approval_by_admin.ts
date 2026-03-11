import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
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

export async function test_api_seller_registration_approval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as regular admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create pending seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerRegistration = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Admin approves the seller registration
  const approvalResponse =
    await api.functional.ecommerceMall.admin.seller_registrations.approve(
      adminConnection,
      {
        sellerRegistrationId: sellerRegistration.id,
        body: {
          approval_status: "approved",
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(approvalResponse);
  // 4. Verify seller account is now active (approved)
  TestValidator.equals(
    "approval_status is approved",
    approvalResponse.approval_status,
    "approved",
  );
  TestValidator.predicate(
    "responded_at is set",
    approvalResponse.responded_at !== null &&
      approvalResponse.responded_at !== undefined,
  );
  // 5. Verify seller can login with approved status
  const sellerLoginResponse =
    await api.functional.ecommerceMall.auth.seller.login(sellerConnection, {
      body: {
        email: sellerRegistration.email,
        password: "1234" satisfies string & tags.Format<"password">,
      } satisfies IEcommerceMallSeller.ILogin,
    });
  typia.assert(sellerLoginResponse);
  TestValidator.equals(
    "seller login successful",
    sellerLoginResponse.shop_name,
    sellerRegistration.shop_name,
  );
}
