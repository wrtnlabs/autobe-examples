import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_profile_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/signup",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCreds },
  );
  // Step 2: Use a placeholder sellerCode for testing
  const sellerCode: string = "test-seller-123"; // Valid format: 4-50 alphanumeric chars
  // Step 3: Retrieve seller profile as admin - should not fail
  const sellerProfile =
    await api.functional.shoppingMall.admin.sellers.getBySellercode(
      adminConnection,
      { sellerCode },
    );
  typia.assert(sellerProfile);
  // Step 4: Verify that unauthenticated user cannot retrieve seller profile
  // Create a dedicated unauthenticated connection following connection isolation pattern
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated user should not be able to retrieve seller profile",
    async () => {
      await api.functional.shoppingMall.admin.sellers.getBySellercode(
        unauthenticatedConnection,
        { sellerCode },
      );
    },
  );
}
