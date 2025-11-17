import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test verifying that admin users can delete a shopping mall product by
 * productCode.
 *
 * This test creates an admin user and authenticates, then deletes a product. It
 * also tests that deletion without authentication is not allowed.
 *
 * Steps:
 *
 * 1. Admin user joins and obtains authorization token.
 * 2. Authenticated admin deletes a product using productCode.
 * 3. Verify deletion succeeded without error.
 * 4. Attempt deletion with unauthenticated connection, expect error.
 */
export async function test_api_shopping_mall_product_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPass123!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://test.example.com/join",
        referrer: "https://test.example.com/",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Clone connection for authenticated requests with token set
  const authConnection: api.IConnection = { ...connection };
  authConnection.headers = { Authorization: admin.token.access };

  // 2. Generate a realistic productCode
  // As productCode is a string, provide a random alphanumeric string with 12 chars
  const productCode = RandomGenerator.alphaNumeric(12);

  // 3. Admin deletes the product by productCode
  await api.functional.shoppingMall.admin.shoppingMallProducts.erase(
    authConnection,
    {
      productCode,
    },
  );

  // 4. Attempt deletion without authentication, expect error
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized deletion attempt should fail",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallProducts.erase(
        unauthConnection,
        {
          productCode,
        },
      );
    },
  );
}
