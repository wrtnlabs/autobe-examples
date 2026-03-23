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

export async function test_api_seller_suspension_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via registration and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminUser);
  // 2. Create seller account via registration and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerShopName = RandomGenerator.name();
  const sellerUser = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: sellerShopName,
    },
  });
  typia.assert(sellerUser);
  // 3. Suspend the seller account with an optional reason
  const suspendedSeller =
    await api.functional.ecommerceMall.admin.seller_suspensions.suspend(
      adminConnection,
      {
        body: {
          seller_id: sellerUser.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspendedSeller);
  // 4. Login as admin to retrieve the suspension record
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(adminLoginConnection);
  // 5. Retrieve the suspension record
  const retrievedSuspension =
    await api.functional.ecommerceMall.admin.seller_suspensions.at(
      adminLoginConnection,
      {
        sellerSuspensionId: suspendedSeller.id,
      },
    );
  typia.assert(retrievedSuspension);
  // 6. Verify the response contains all expected fields
  TestValidator.equals(
    "suspension ID matches",
    retrievedSuspension.id,
    suspendedSeller.id,
  );
  TestValidator.equals(
    "seller ID matches",
    retrievedSuspension.seller_id,
    sellerUser.id,
  );
  TestValidator.equals(
    "shop name matches",
    retrievedSuspension.seller.shop_name,
    sellerShopName,
  );
  TestValidator.equals(
    "admin ID matches",
    retrievedSuspension.admin_id,
    adminUser.id,
  );
  TestValidator.equals(
    "admin email matches",
    retrievedSuspension.admin.email,
    adminEmail,
  );
  // Verify reason is correctly set
  TestValidator.predicate(
    "reason exists and matches",
    retrievedSuspension.reason !== null &&
      retrievedSuspension.reason === suspendedSeller.reason,
  );
  // Verify timestamps are valid ISO date strings
  TestValidator.predicate(
    "created_at is valid ISO date",
    !isNaN(Date.parse(retrievedSuspension.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    !isNaN(Date.parse(retrievedSuspension.updated_at)),
  );
  TestValidator.predicate(
    "seller.created_at is valid ISO date",
    !isNaN(Date.parse(retrievedSuspension.seller.created_at)),
  );
  // Verify admin structure
  TestValidator.predicate(
    "admin has required fields",
    retrievedSuspension.admin.id !== undefined &&
      retrievedSuspension.admin.email !== undefined &&
      retrievedSuspension.admin.grade !== undefined,
  );
  // Verify seller structure
  TestValidator.predicate(
    "seller has required fields",
    retrievedSuspension.seller.id !== undefined &&
      retrievedSuspension.seller.shop_name !== undefined &&
      retrievedSuspension.seller.approval_status !== undefined &&
      retrievedSuspension.seller.is_suspended !== undefined &&
      retrievedSuspension.seller.created_at !== undefined,
  );
}
