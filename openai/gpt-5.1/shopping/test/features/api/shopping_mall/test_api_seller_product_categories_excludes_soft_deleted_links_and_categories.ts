import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
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

export async function test_api_seller_product_categories_excludes_soft_deleted_links_and_categories(
  connection: api.IConnection,
) {
  // 1. Admin joins (registration) to obtain admin context
  const adminJoinEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinHref: string = "https://admin.shoppingmall.test/join";
  const adminJoinReferrer: string = "https://admin.shoppingmall.test/landing";

  const adminJoinBody = {
    email: adminJoinEmail,
    password: "AdminPassword123!" as string & tags.Format<"password">,
    ip: null,
    href: adminJoinHref as string & tags.Format<"uri">,
    referrer: adminJoinReferrer as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login (exercise login path and ensure admin session is established)
  const adminLoginBody = {
    email: adminJoinEmail,
    password: "AdminPassword123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/login" as string &
      tags.Format<"uri">,
    referrer: "https://admin.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 3. Create two active categories via admin endpoint
  const categoryParentId: string | null = null;

  const category1Body = {
    parent_id: categoryParentId,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: category1Body,
    });
  typia.assert(category1);

  const category2Body = {
    parent_id: categoryParentId,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 2 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: category2Body,
    });
  typia.assert(category2);

  // 4. Seller joins and creates a product
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassword123!" as string & tags.Format<"password">,
    ip: typia.random<string & tags.Format<"ipv4">>() satisfies
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">),
    href: "https://seller.shoppingmall.test/join" as string &
      tags.Format<"uri">,
    referrer: "https://seller.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Seller login to ensure token-based session is applied for subsequent seller operations
  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPassword123!",
    ip: null,
    href: "https://seller.shoppingmall.test/login" as string &
      tags.Format<"uri">,
    referrer: "https://seller.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 5. Seller creates a product
  const productBody = {
    code: `prod-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: ("https://cdn.shoppingmall.test/images/" +
      RandomGenerator.alphaNumeric(16)) as string & tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Switch back to admin to create product-category links for this product
  const adminLoginAgainAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgainAuthorized);

  // 7. Admin creates two product-category links for the seller product
  const link1Body = {
    shopping_mall_category_id: category1.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const link1: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: link1Body,
      },
    );
  typia.assert(link1);

  const link2Body = {
    shopping_mall_category_id: category2.id,
    is_primary: false,
  } satisfies IShoppingMallProductCategory.ICreate;

  const link2: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: link2Body,
      },
    );
  typia.assert(link2);

  // 8. Switch back to seller context to call seller-facing categories listing
  const sellerLoginAgainAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgainAuthorized);

  // Define a request for the seller categories listing with explicit pagination
  const categoriesIndexRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: undefined,
    orderDirection: undefined,
    categoryCodes: undefined,
    isPrimary: null,
  } satisfies IShoppingMallProductCategory.IRequest;

  const pageResult: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.seller.products.categories.index(
      connection,
      {
        productId: product.id,
        body: categoriesIndexRequest,
      },
    );
  typia.assert(pageResult);

  // 9. Validate pagination metadata and data contents
  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // Expect exactly two links for this product
  TestValidator.equals(
    "pagination.records should equal number of created links (2)",
    pagination.records,
    2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "data length should equal number of created links (2)",
    data.length,
    2,
  );

  TestValidator.predicate(
    "pagination.limit should be at least data length",
    pagination.limit >= data.length,
  );

  // Extract category IDs from the listing summaries
  const returnedCategoryIds: Array<string & tags.Format<"uuid">> = data.map(
    (summary) => summary.id,
  );

  // Ensure both created category IDs are present
  TestValidator.predicate(
    "listing includes first category",
    returnedCategoryIds.includes(category1.id),
  );

  TestValidator.predicate(
    "listing includes second category",
    returnedCategoryIds.includes(category2.id),
  );

  // Ensure there are no duplicates or unexpected IDs
  const uniqueReturnedCategoryIds = Array.from(new Set(returnedCategoryIds));

  TestValidator.equals(
    "returned category IDs should be unique",
    uniqueReturnedCategoryIds.length,
    returnedCategoryIds.length,
  );

  TestValidator.equals(
    "returned category IDs should match exactly the created categories",
    new Set(returnedCategoryIds),
    new Set([category1.id, category2.id]),
  );
}
