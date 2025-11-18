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
 * Validate that tags linked to a visible product are listed publicly with a
 * correct pagination envelope and tag metadata.
 *
 * Business flow covered by this test:
 *
 * 1. Admin joins and logs in to obtain an admin context.
 * 2. Seller joins and logs in to obtain a seller context.
 * 3. Admin creates a product category to classify products.
 * 4. Seller creates a new product and marks it as visible/active.
 * 5. Admin links the created product to the category.
 * 6. Admin creates multiple product tags in the master tag catalog.
 * 7. Seller links a subset of those tags to the product via the product–tag link
 *    API.
 * 8. A public, unauthenticated connection (no Authorization header) calls PATCH
 *    /shoppingMall/products/{productId}/tags.
 * 9. The response is asserted as a valid `IPageIShoppingMallProductTag.ISummary`.
 * 10. The test verifies that:
 *
 *     - The pagination object has non-negative current, limit, records, and pages.
 *     - The `data` array contains at least the tags that were linked to the product.
 *     - Every returned element is an `IShoppingMallProductTag.ISummary` with matching
 *           `id`, `name`, and `slug` for the linked tags.
 *     - Pagination `records` equals the length of `data` in this simple scenario.
 */
export async function test_api_product_tags_list_for_public_visible_product(
  connection: api.IConnection,
) {
  // 1. Admin joins to get an authorized admin context
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: "Admin#1234" as string & tags.Format<"password">,
    ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    href: "https://admin.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.local/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seller joins and logs in
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: "Seller#1234" as string & tags.Format<"password">,
    ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    href: "https://seller.local/join" as string & tags.Format<"uri">,
    referrer: "https://seller.local/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoinOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoinOutput);

  // Explicit seller login (even though join already authenticated) to
  // demonstrate usage of the login API and ensure seller session context
  const sellerLoginBody = {
    email: sellerEmail,
    password: "Seller#1234",
    ip: "127.0.0.1",
    href: "https://seller.local/login" as string & tags.Format<"uri">,
    referrer: "https://seller.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Admin creates a category (switch auth back to admin)
  const adminLoginBody = {
    email: adminEmail,
    password: "Admin#1234" as string & tags.Format<"password">,
    ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    href: "https://admin.local/login" as string & tags.Format<"uri">,
    referrer: "https://admin.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

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

  // 4. Switch back to seller context and create a visible product
  const sellerReloginBody = {
    email: sellerEmail,
    password: "Seller#1234",
    ip: "127.0.0.1",
    href: "https://seller.local/login-again" as string & tags.Format<"uri">,
    referrer: "https://seller.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerReloginBody,
    });
  typia.assert(sellerRelogin);

  const productCreateBody = {
    code: `P-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: "https://cdn.local/images/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Admin links the product to the category
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

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

  // 6. Admin creates multiple product tags
  const tagCount = 3;
  const createdTags: IShoppingMallProductTag[] = [];

  for (let i = 0; i < tagCount; i++) {
    const tagCreateBody = {
      code: `tag-${RandomGenerator.alphaNumeric(8)}`,
      label: RandomGenerator.paragraph({ sentences: 1 }),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      isActive: true,
    } satisfies IShoppingMallProductTag.ICreate;

    const tag: IShoppingMallProductTag =
      await api.functional.shoppingMall.admin.productTags.create(connection, {
        body: tagCreateBody,
      });
    typia.assert(tag);
    createdTags.push(tag);
  }

  // 7. Seller links a subset of those tags to the product
  const sellerLoginForTagging: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginForTagging);

  const linkedTags: IShoppingMallProductTag[] = [];

  // Link the first two tags to the product
  for (let i = 0; i < 2; i++) {
    const tagToLink = createdTags[i];

    const linkCreateBody = {
      product_tag_id: tagToLink.id,
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
    linkedTags.push(tagToLink);
  }

  // 8. Build a public, unauthenticated connection (no Authorization header).
  // Note: The SDK internally manages headers, but for public access we create
  // a shallow copy with an empty headers object so that no prior auth header
  // is reused.
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 9. Call the public tag list endpoint for the created product
  const page: IPageIShoppingMallProductTag.ISummary =
    await api.functional.shoppingMall.products.tags.index(publicConnection, {
      productId: product.id,
    });
  typia.assert(page);

  // 10. Validate pagination contract basics
  const pagination: IPage.IPagination = page.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "pagination fields are non-negative",
    pagination.current >= 0 &&
      pagination.limit >= 0 &&
      pagination.records >= 0 &&
      pagination.pages >= 0,
  );

  TestValidator.equals(
    "records count matches data length in simple scenario",
    page.data.length,
    pagination.records,
  );

  // 11. Validate that at least the explicitly linked tags appear in data
  const dataById = new Map<string, IShoppingMallProductTag.ISummary>();
  for (const summary of page.data) {
    dataById.set(summary.id, summary);
  }

  for (const tag of linkedTags) {
    const found = dataById.get(tag.id);
    TestValidator.predicate(
      "linked tag is present in tag listing",
      found !== undefined,
    );

    if (found !== undefined) {
      TestValidator.equals("tag id matches", found.id, tag.id);
      // The summary uses `name` and `slug` derived from the tag master.
      // The full tag DTO exposes `name` and `slug` as well, so we assert
      // equality for those identifying fields.
      TestValidator.equals("tag name matches master", found.name, tag.name);
      TestValidator.equals("tag slug matches master", found.slug, tag.slug);
    }
  }
}
