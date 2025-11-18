import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductTag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Verify that listing tags for a product with no tag links returns a successful
 * empty page, not an error.
 *
 * Business context:
 *
 * - Products may or may not have tags linked via shopping_mall_product_tag_links.
 * - Public callers (unauthenticated) should be able to query the tag list for a
 *   visible product safely.
 * - When a product has no tag links, the endpoint should still return a valid
 *   paginated response envelope with an empty data array and zero records,
 *   instead of treating this as an exceptional condition.
 *
 * Test steps:
 *
 * 1. Register an admin account and obtain an authorized admin context.
 * 2. Register a seller account and obtain an authorized seller context.
 * 3. As admin, create a catalog category.
 * 4. As seller, create a new product with all required fields.
 * 5. As admin, associate the product with the category (for catalog consistency)
 *    but do NOT create any product tag links.
 * 6. From an unauthenticated connection, call PATCH
 *    /shoppingMall/products/{productId}/tags for this product.
 * 7. Assert that the response is a valid IPageIShoppingMallProductTag.ISummary
 *    with pagination.records === 0, pages >= 0, and data.length === 0.
 * 8. Repeat the call using an authenticated connection to confirm that
 *    authorization context does not change the empty result semantics for an
 *    untagged product, and that public vs authed responses are consistent.
 */
export async function test_api_product_tags_list_empty_when_no_links_exist(
  connection: api.IConnection,
) {
  // 1. Admin joins (and implicitly gets an authorized context)
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 2. Seller joins (authorized seller context, SDK will set Authorization)
  const sellerPassword = typia.random<string & tags.Format<"password">>();

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 3. Admin creates a category (switch back to admin account)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/landing" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 0,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 4. Seller creates a product (switch to seller account)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerJoinBody.email,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com/landing" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Admin associates product with the category (but no tags are created)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/landing" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  // 6. Call tag listing from an unauthenticated connection
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  const publicPage: IPageIShoppingMallProductTag.ISummary =
    await api.functional.shoppingMall.products.tags.index(publicConnection, {
      productId: product.id,
    });
  typia.assert(publicPage);

  // 7. Validate that pagination shows zero records and data is empty
  const publicPagination = publicPage.pagination;
  typia.assert<IPage.IPagination>(publicPagination);

  TestValidator.equals(
    "public tag list should have zero records",
    publicPagination.records,
    0,
  );

  TestValidator.predicate(
    "public tag list pages should be non-negative when records=0",
    publicPagination.pages >= 0,
  );

  TestValidator.equals(
    "public tag list data should be empty when no tags exist",
    publicPage.data.length,
    0,
  );

  // 8. Call the same endpoint using authenticated (seller) connection
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerJoinBody.email,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com/landing" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const authedPage: IPageIShoppingMallProductTag.ISummary =
    await api.functional.shoppingMall.products.tags.index(connection, {
      productId: product.id,
    });
  typia.assert(authedPage);

  const authedPagination = authedPage.pagination;
  typia.assert<IPage.IPagination>(authedPagination);

  TestValidator.equals(
    "authed tag list should have zero records",
    authedPagination.records,
    0,
  );

  TestValidator.equals(
    "authed tag list data should be empty when no tags exist",
    authedPage.data.length,
    0,
  );

  // Cross-compare public and authenticated responses for consistency
  TestValidator.equals(
    "public and authed tag list pagination should match",
    authedPagination,
    publicPagination,
  );

  TestValidator.equals(
    "public and authed tag list data arrays should match",
    authedPage.data,
    publicPage.data,
  );
}
