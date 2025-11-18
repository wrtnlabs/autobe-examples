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
 * Ensure that creating a product–category link on the admin endpoint requires
 * admin authentication.
 *
 * Business workflow covered by this test:
 *
 * 1. Register a seller account and obtain an authenticated seller context.
 * 2. As that seller, create a concrete product that will be used for linking.
 * 3. Register an admin account and obtain an authenticated admin context.
 * 4. As that admin, create a catalog category.
 * 5. Attempt to create a product–category link WITHOUT any Authorization header
 *    and assert that the operation fails.
 * 6. Repeat the same link creation WITH a valid admin Authorization context and
 *    assert that it succeeds and returns a valid IShoppingMallProductCategory
 *    record.
 *
 * This validates that:
 *
 * - Admin-only catalog operations are properly protected.
 * - A valid product and category can be linked when the caller is a properly
 *   authenticated admin.
 */
export async function test_api_admin_product_category_link_creation_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register seller (join) to obtain seller auth context
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. As seller, create a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Test Brand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: ("https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(16)) as string & tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Register admin (join) -> connection becomes admin-authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. As admin, create a category
  const categoryCreateBody = {
    parent_id: null,
    slug: "autobe-test-" + RandomGenerator.alphaNumeric(8),
    name_en: "AutoBE Test Category",
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 5. Prepare product-category link request body
  const linkCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  // 6. Build an unauthenticated connection (no Authorization header)
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Attempt to create link without admin auth and expect failure
  await TestValidator.error(
    "creating product-category link without admin auth should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.categories.create(
        unauthenticated,
        {
          productId: product.id,
          body: linkCreateBody,
        },
      );
    },
  );

  // 8. Using authenticated admin connection, create the product-category link successfully
  const link: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: linkCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(link);

  // Basic business-level assertions
  TestValidator.equals(
    "linked product id should match created product",
    link.shopping_mall_product_id,
    product.id,
  );

  TestValidator.equals(
    "linked category id should match created category",
    link.shopping_mall_category_id,
    category.id,
  );

  TestValidator.equals(
    "is_primary flag should be preserved on link",
    link.is_primary,
    linkCreateBody.is_primary,
  );
}
