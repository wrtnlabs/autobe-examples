import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCatalogVisibilityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogVisibilityRule";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Validate that requesting catalog visibility rule details with a non-existent
 * ID results in an error for an authenticated admin.
 *
 * Business goal:
 *
 * - Ensure the admin-only detail endpoint for catalog visibility rules does not
 *   accidentally succeed or leak data when provided with a random UUID that
 *   does not correspond to any persisted rule.
 * - Confirm that the API rejects such a request with an error (typically a
 *   not-found HTTP error) when the rule does not exist.
 *
 * High-level scenario:
 *
 * 1. Register an admin account via /auth/admin/join to obtain an authenticated
 *    admin context.
 * 2. Optionally create a seller and a product to demonstrate catalog flows are
 *    operational, though they are not directly tied to any visibility rule ID
 *    used in this test.
 * 3. Generate a random UUID that is never used to create a visibility rule in this
 *    test.
 * 4. As the authenticated admin, call GET
 *    /shoppingMall/admin/catalogVisibilityRules/{catalogVisibilityRuleId} with
 *    that random UUID.
 * 5. Assert that the call fails by throwing an HTTP error. Per global guidelines,
 *    do not assert exact status codes or error payload structures— only the
 *    fact that an error occurs.
 */
export async function test_api_catalog_visibility_rule_detail_not_found_for_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Register an admin to get an authenticated admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. (Optional) Create a seller and a product just to exercise related flows.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Login again as seller (explicitly testing seller login flow, though not strictly required).
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // Create a product as the logged-in seller to ensure catalog flows are operational.
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Switch back to admin context by logging in with the admin email/password.
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 4. Generate a random UUID that is never used for any visibility rule.
  const nonexistentRuleId = typia.random<string & tags.Format<"uuid">>();

  // 5. As admin, calling the detail endpoint with this UUID must fail.
  await TestValidator.error(
    "catalog visibility rule detail should fail for nonexistent id",
    async () => {
      await api.functional.shoppingMall.admin.catalogVisibilityRules.at(
        connection,
        {
          catalogVisibilityRuleId: nonexistentRuleId,
        },
      );
    },
  );
}
