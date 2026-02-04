import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSellerRejectionReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerRejectionReason";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_rejection_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a valid sellerId using typia.random
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create a valid rejection reason (minimum 10 characters as required)
  const validReason: IShoppingMallSellerRejectionReason = {
    reason:
      "Seller violated platform policies by using false product information.",
  };
  // Step 4: Test successful rejection of a seller
  await api.functional.shoppingMall.admin.sellers.reject(adminConnection, {
    sellerId,
    body: validReason,
  });
  // Step 5: Test rejection with invalid reason (shorter than 10 characters)
  const invalidReason: IShoppingMallSellerRejectionReason = {
    reason: "Short", // Only 5 characters
  };
  await TestValidator.error(
    "reject with reason shorter than 10 characters",
    async () => {
      await api.functional.shoppingMall.admin.sellers.reject(adminConnection, {
        sellerId,
        body: invalidReason,
      });
    },
  );
  // Step 6: Test rejection with empty reason
  const emptyReason: IShoppingMallSellerRejectionReason = {
    reason: "", // Empty string
  };
  await TestValidator.error("reject with empty reason", async () => {
    await api.functional.shoppingMall.admin.sellers.reject(adminConnection, {
      sellerId,
      body: emptyReason,
    });
  });
  // Step 7: Test rejection as non-admin user (should fail)
  // Use an unauthenticated connection (no authorization)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("reject as non-admin user", async () => {
    await api.functional.shoppingMall.admin.sellers.reject(
      unauthenticatedConnection,
      {
        sellerId,
        body: validReason,
      },
    );
  });
  // Step 8: Test rejection with non-existent seller ID
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error("reject non-existent seller", async () => {
    await api.functional.shoppingMall.admin.sellers.reject(adminConnection, {
      sellerId: nonExistentId,
      body: validReason,
    });
  });
}
