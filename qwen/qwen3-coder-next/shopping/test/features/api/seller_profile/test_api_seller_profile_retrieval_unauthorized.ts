import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_profile_retrieval_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: "Admin@1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminResponse);
  // Setup: Create another admin account for authentication
  const adminConnection2: api.IConnection = { host: connection.host };
  const adminEmail2 = typia.random<string & tags.Format<"email">>();
  const adminResponse2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: adminEmail2,
      password: "Admin@5678",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminResponse2);
  // Setup: Create seller account (not authenticated as admin)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerResponse = await api.functional.shoppingMall.auth.admin.join(
    sellerConnection,
    {
      body: {
        email: sellerEmail,
        password: "Seller@1234",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(sellerResponse);
  // Test 1: Non-admin seller cannot access another seller's profile
  await TestValidator.error("seller cannot access seller profile", async () => {
    await api.functional.shoppingMall.admin.admin.sellers.at(sellerConnection, {
      sellerId: adminResponse.id,
    });
  });
  // Test 2: Another admin can access seller profile (success case)
  const sellerProfile =
    await api.functional.shoppingMall.admin.admin.sellers.at(adminConnection2, {
      sellerId: adminResponse.id,
    });
  typia.assert(sellerProfile);
  // Verify profile data structure
  TestValidator.predicate(
    "seller profile has id",
    typeof sellerProfile.id === "string",
  );
  TestValidator.predicate(
    "seller profile has shop_name",
    typeof sellerProfile.shop_name === "string",
  );
}
