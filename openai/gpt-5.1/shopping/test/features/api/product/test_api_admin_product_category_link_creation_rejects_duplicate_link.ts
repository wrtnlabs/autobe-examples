import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that admin product-category link creation rejects duplicate links.
 *
 * Business goal: Ensure that the junction table
 * `shopping_mall_product_categories` enforces a uniqueness constraint on
 * (shopping_mall_product_id, shopping_mall_category_id) by rejecting attempts
 * to create the same product–category link twice for the same product and
 * category, while allowing the first creation to succeed.
 *
 * High-level test steps:
 *
 * 1. Register a seller and obtain authenticated seller context via `POST
 *    /auth/seller/join` (SDK: api.functional.auth.seller.join).
 * 2. With seller auth, create a product via `POST /shoppingMall/seller/products`
 *    using IShoppingMallProduct.ICreate and capture the returned product.id.
 * 3. Register an admin via `POST /auth/admin/join` (SDK:
 *    api.functional.auth.admin.join). This also authenticates the admin and
 *    sets the Authorization header.
 * 4. With admin auth, create a category via `POST /shoppingMall/admin/categories`
 *    using IShoppingMallCategory.ICreate and capture category.id.
 * 5. Using admin auth and the captured product.id and category.id, call `POST
 *    /shoppingMall/admin/products/{productId}/categories` through
 *    `api.functional.shoppingMall.admin.products.categories.create`, passing a
 *    body that satisfies IShoppingMallProductCategory.ICreate with
 *    `shopping_mall_category_id` set to category.id and `is_primary: true`.
 *    Assert that this first call succeeds and returns a valid
 *    IShoppingMallProductCategory.
 * 6. Immediately call the same endpoint again with the same productId and an
 *    identical body (same category id and is_primary flag).
 * 7. Assert that the second call fails with an HTTP error (4xx client error) that
 *    indicates a uniqueness violation on the junction table. Do not assert
 *    specific status codes; instead, simply ensure that an HttpError is thrown
 *    by the second call using `await TestValidator.error`.
 * 8. Optionally assert that the error type is api.HttpError by catching and
 *    rethrowing inside the callback if it is not an HttpError, but do not
 *    inspect or assert specific status numbers.
 *
 * Implementation details and constraints:
 *
 * - Use the imported DTO types exactly as provided:
 *
 *   - IShoppingMallSellerAuthJoin.IRequest for seller join body
 *   - IShoppingMallSellerAuthLogin.IRequest for seller login if needed
 *   - IShoppingMallAdminJoin.ICreate for admin join body
 *   - IShoppingMallAdminLogin.ICreate for admin login if needed
 *   - IShoppingMallProduct.ICreate for seller product creation body
 *   - IShoppingMallCategory.ICreate for category creation body
 *   - IShoppingMallProductCategory.ICreate for product-category link body
 * - Rely on the SDK to manage Authorization headers automatically. Never read or
 *   modify `connection.headers` directly.
 * - For random data, use `typia.random<...>()` with appropriate tag types (e.g.,
 *   `string & tags.Format<"email">` for email fields and `string &
 *   tags.Format<"uri">` for href/referrer/primary_image_uri).
 * - Always call `typia.assert(...)` on non-void API responses to validate the
 *   returned shapes.
 * - For error validation, wrap the duplicate creation call in `await
 *   TestValidator.error("duplicate product-category link should fail", async ()
 *   => { ... })`. Inside the callback, perform the awaited API call. Do not
 *   attempt to assert concrete HTTP status codes, only that an error is
 *   thrown.
 * - Do not write type-error-based tests (no `as any`, no intentionally wrong
 *   types or missing required fields). The uniqueness violation must be
 *   demonstrated using correctly typed payloads that conflict only at the
 *   business rule level.
 */
export async function test_api_admin_product_category_link_creation_rejects_duplicate_link(
  connection: api.IConnection,
) {
  // 1. Register a seller (join) and establish seller authentication context.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. With seller auth, create a product.
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Register an admin and establish admin authentication context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. With admin auth, create a category.
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 5. Create first product-category link via admin endpoint.
  const linkCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const firstLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: linkCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(firstLink);

  // 6 & 7. Attempt to create the same link again and assert that it fails.
  await TestValidator.error(
    "duplicate product-category link should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.categories.create(
        connection,
        {
          productId: product.id,
          body: linkCreateBody,
        },
      );
    },
  );
}
