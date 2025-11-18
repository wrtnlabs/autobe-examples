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
 * Basic happy-path test for admin retrieval of a product-category link.
 *
 * Business goal
 *
 * - Ensure that an authenticated admin can fetch a specific
 *   `shopping_mall_product_categories` junction row for a given product.
 * - Verify that the retrieved link data matches the link created earlier in the
 *   test flow.
 *
 * High level scenario
 *
 * 1. A seller joins the platform and creates a product.
 * 2. An admin joins (and becomes the current authenticated actor).
 * 3. The admin creates a category.
 * 4. The admin creates a product-category link for the product.
 * 5. The admin retrieves that link by GET
 *    /shoppingMall/admin/products/{productId}/categories/{productCategoryLinkId}.
 * 6. The test validates that the retrieved DTO matches the created link and is
 *    correctly scoped to the product.
 */
export async function test_api_admin_product_category_link_retrieval_basic_flow(
  connection: api.IConnection,
) {
  // 1. Seller joins
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
  typia.assert(sellerAuthorized);

  // 2. Seller creates a product
  const productBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Admin joins (switches auth context to admin)
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
  typia.assert(adminAuthorized);

  // 4. Admin creates a category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    description_en: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 5. Admin creates a product-category link for the product
  const linkCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const createdLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: linkCreateBody,
      },
    );
  typia.assert(createdLink);

  // Sanity: created link references the expected product and category
  TestValidator.equals(
    "created link product id should match product.id",
    createdLink.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "created link category id should match category.id",
    createdLink.shopping_mall_category_id,
    category.id,
  );

  // 6. Admin retrieves the specific product-category link
  const fetchedLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.at(connection, {
      productId: product.id,
      productCategoryLinkId: createdLink.id,
    });
  typia.assert(fetchedLink);

  // 7. Validate retrieved link matches created link
  TestValidator.equals(
    "fetched link id should equal created link id",
    fetchedLink.id,
    createdLink.id,
  );
  TestValidator.equals(
    "fetched link product id should equal product.id",
    fetchedLink.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "fetched link category id should equal category.id",
    fetchedLink.shopping_mall_category_id,
    category.id,
  );
  TestValidator.equals(
    "fetched link is_primary should match created link",
    fetchedLink.is_primary,
    createdLink.is_primary,
  );

  TestValidator.equals(
    "fetched link deleted_at should be null for active association",
    fetchedLink.deleted_at ?? null,
    null,
  );
}
