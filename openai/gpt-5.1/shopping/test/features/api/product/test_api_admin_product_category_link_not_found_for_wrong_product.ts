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
 * Verify that a product-category link cannot be fetched under a mismatched
 * product context.
 *
 * Business goal: Ensure that GET
 * /shoppingMall/admin/products/{productId}/categories/{productCategoryLinkId}
 * only exposes links that belong to the specified product, and returns an HTTP
 * error (404-style) when a valid link id is queried under the wrong productId.
 *
 * Scenario steps:
 *
 * 1. Join as admin.
 * 2. Join and login as seller.
 * 3. As seller, create two products (product1 and product2).
 * 4. Login as admin.
 * 5. As admin, create a category.
 * 6. As admin, create a product-category link for product1.
 * 7. Confirm that GET with (product1, linkId) succeeds.
 * 8. Confirm that GET with (product2, same linkId) throws an HttpError with 404
 *    not-found semantics.
 */
export async function test_api_admin_product_category_link_not_found_for_wrong_product(
  connection: api.IConnection,
) {
  // 1. Join as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoinOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // 2. Join and login as seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoinOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoinOutput);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginOutput);

  // 3. As seller, create two products
  const productCreateBase = () =>
    ({
      code: RandomGenerator.alphaNumeric(12),
      title: RandomGenerator.paragraph({ sentences: 3 }),
      summary: RandomGenerator.paragraph({ sentences: 5 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      brand: RandomGenerator.name(1),
      model_name: RandomGenerator.name(1),
      status: "active",
      primary_image_uri:
        "https://example.com/" + RandomGenerator.alphaNumeric(8),
      default_locale: "en-US",
    }) satisfies IShoppingMallProduct.ICreate;

  const product1: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBase(),
    });
  typia.assert(product1);

  const product2: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBase(),
    });
  typia.assert(product2);

  // 4. Login as admin (switch context back to admin)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  // 5. As admin, create a category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 6. As admin, create a product-category link for product1
  const linkCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const linkForProduct1: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product1.id,
        body: linkCreateBody,
      },
    );
  typia.assert(linkForProduct1);

  // 7. Confirm that GET with (product1, linkId) succeeds
  const fetchedCorrect: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.at(connection, {
      productId: product1.id,
      productCategoryLinkId: linkForProduct1.id,
    });
  typia.assert(fetchedCorrect);

  TestValidator.equals(
    "link fetched with correct productId should match created link id",
    fetchedCorrect.id,
    linkForProduct1.id,
  );

  // 8. Confirm that GET with (product2, same linkId) fails with HttpError (404)
  await TestValidator.httpError(
    "link fetched with wrong productId should result in 404 not-found error",
    404,
    async () => {
      await api.functional.shoppingMall.admin.products.categories.at(
        connection,
        {
          productId: product2.id,
          productCategoryLinkId: linkForProduct1.id,
        },
      );
    },
  );
}
