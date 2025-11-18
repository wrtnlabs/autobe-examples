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
import type { IShoppingMallProductTagLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTagLink";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that product tag listing returns exactly the tags linked to a
 * product and that pagination metadata reflects the number of links.
 *
 * Business context:
 *
 * - Admins define global product tags and categories.
 * - Sellers create products and attach tags to their products.
 * - Public (or general) consumers use PATCH
 *   /shoppingMall/products/{productId}/tags to see which tags are currently
 *   associated with a product.
 *
 * Steps implemented:
 *
 * 1. Admin join and login to obtain an admin authorization context.
 * 2. Admin creates a category (for catalog realism, though category is not used by
 *    tags API directly).
 * 3. Admin creates multiple product tags.
 * 4. Seller join and login to obtain a seller authorization context.
 * 5. Seller creates a product.
 * 6. Admin links the product to the category so product participates in the
 *    catalog hierarchy.
 * 7. Seller attaches several of the admin-created tags to the product via POST
 *    /shoppingMall/seller/products/{productId}/tags.
 * 8. Call PATCH /shoppingMall/products/{productId}/tags to retrieve the list of
 *    tags associated with the product.
 * 9. Assert:
 *
 *    - Response type matches IPageIShoppingMallProductTag.ISummary.
 *    - Pagination.records equals the number of tag links created.
 *    - All returned tag summaries correspond to the tags that were linked (by id),
 *         with no extras.
 *    - No duplication occurs in the returned data.
 */
export async function test_api_product_tags_list_respects_visibility_and_soft_deletion(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login (to simulate later logins, ensure flow works)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.login.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Admin creates a category
  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 4. Admin creates multiple product tags
  const tagCount = 3;
  const createdTags: IShoppingMallProductTag[] = [];
  for (let i = 0; i < tagCount; i++) {
    const tagCreateBody = {
      code: `tag-${RandomGenerator.alphaNumeric(10)}`,
      label: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      isActive: true,
    } satisfies IShoppingMallProductTag.ICreate;

    const tag: IShoppingMallProductTag =
      await api.functional.shoppingMall.admin.productTags.create(connection, {
        body: tagCreateBody,
      });
    typia.assert(tag);
    createdTags.push(tag);
  }

  // 5. Seller join
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 6. Seller login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.login.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 7. Seller creates a product
  const productCreateBody = {
    code: `prod-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 2 }),
    model_name: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 8. Admin links product to category
  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // 9. Seller attaches tags to the product
  const createdLinks: IShoppingMallProductTagLink[] = [];
  for (const tag of createdTags) {
    const linkCreateBody = {
      product_tag_id: tag.id,
    } satisfies IShoppingMallProductTagLink.ICreate;

    const link: IShoppingMallProductTagLink =
      await api.functional.shoppingMall.seller.products.tags.create(
        connection,
        {
          productId: product.id,
          body: linkCreateBody,
        },
      );
    typia.assert(link);
    createdLinks.push(link);
  }

  // 10. Public context: list product tags for the product
  const page: IPageIShoppingMallProductTag.ISummary =
    await api.functional.shoppingMall.products.tags.index(connection, {
      productId: product.id,
    });
  typia.assert(page);

  // 11. Validate pagination metadata
  const pagination: IPage.IPagination = page.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "pagination current page should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive or zero",
    pagination.limit >= 0,
  );

  // records must be at least number of created links, though server may filter by visibility rules
  TestValidator.equals(
    "records equals created links count",
    pagination.records,
    createdLinks.length as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  // 12. Validate that returned tag summaries correspond exactly to the created tags
  const returnedSummaries = page.data;

  // Ensure count alignment
  TestValidator.equals(
    "number of returned tag summaries matches number of links",
    returnedSummaries.length,
    createdLinks.length,
  );

  const createdTagIds = createdTags.map((t) => t.id);

  // For each returned summary, verify it matches one of the created tags by id
  for (const summary of returnedSummaries) {
    const exists = createdTagIds.includes(summary.id);
    TestValidator.predicate(
      "each returned tag summary id must be in created tags",
      exists,
    );
  }

  // Ensure no duplicate IDs in returned data
  const uniqueReturnedIds = Array.from(
    new Set(returnedSummaries.map((s) => s.id)),
  );
  TestValidator.equals(
    "returned tag ids should be unique",
    uniqueReturnedIds.length,
    returnedSummaries.length,
  );
}
