import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
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

export async function test_api_product_search_filter_by_category(
  connection: api.IConnection,
) {
  // 1. Admin joins (auto-auth)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedFromJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Seller joins (auto-auth)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorizedFromJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorizedFromJoin);

  // 3. As seller, create first product
  const baseProductCode1 = RandomGenerator.alphaNumeric(12);
  const productCreateBody1 = {
    code: baseProductCode1,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product1: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody1,
    });
  typia.assert(product1);

  // 4. Switch back to admin via explicit login to ensure clean admin context
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorizedFromLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 5. Create two distinct categories as admin
  const categorySlug1 = `cat-${RandomGenerator.alphaNumeric(8)}`;
  const categoryCreateBody1 = {
    parent_id: null,
    slug: categorySlug1,
    name_en: "Category One " + RandomGenerator.name(1),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody1,
    });
  typia.assert(category1);

  const categorySlug2 = `cat-${RandomGenerator.alphaNumeric(8)}`;
  const categoryCreateBody2 = {
    parent_id: null,
    slug: categorySlug2,
    name_en: "Category Two " + RandomGenerator.name(1),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 2 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody2,
    });
  typia.assert(category2);

  // 6. Link product1 to category1 as primary
  const product1CategoryLinkBody = {
    shopping_mall_category_id: category1.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const product1CategoryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product1.id,
        body: product1CategoryLinkBody,
      },
    );
  typia.assert(product1CategoryLink);

  // 7. Search products with category_code = categorySlug1 and verify product1
  const searchRequestForCategory1 = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    cursor: undefined,
    search: undefined,
    status: undefined,
    seller_id: undefined,
    category_code: categorySlug1,
    min_created_at: undefined,
    max_created_at: undefined,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallProduct.IRequest;

  const searchResultForCategory1: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: searchRequestForCategory1,
    });
  typia.assert(searchResultForCategory1);

  const product1Summary = searchResultForCategory1.data.find(
    (summary) => summary.id === product1.id,
  );

  TestValidator.predicate(
    "search results with category_code=categorySlug1 must contain product1",
    product1Summary !== undefined,
  );

  if (product1Summary !== undefined) {
    TestValidator.equals(
      "primaryCategoryName of product1 summary must match category1.name_en",
      product1Summary.primaryCategoryName ?? null,
      category1.name_en,
    );
  }

  // 8. Create a second product for the same seller and link it only to category2
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorizedFromLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorizedFromLogin);

  const baseProductCode2 = RandomGenerator.alphaNumeric(12);
  const productCreateBody2 = {
    code: baseProductCode2,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product2: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody2,
    });
  typia.assert(product2);

  // Switch to admin again for category linking
  const adminAuthorizedFromLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLoginAgain);

  const product2CategoryLinkBody = {
    shopping_mall_category_id: category2.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const product2CategoryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product2.id,
        body: product2CategoryLinkBody,
      },
    );
  typia.assert(product2CategoryLink);

  // Search with category_code = categorySlug2 and ensure only product2 is present
  const searchRequestForCategory2 = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    cursor: undefined,
    search: undefined,
    status: undefined,
    seller_id: undefined,
    category_code: categorySlug2,
    min_created_at: undefined,
    max_created_at: undefined,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallProduct.IRequest;

  const searchResultForCategory2: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: searchRequestForCategory2,
    });
  typia.assert(searchResultForCategory2);

  const product2Summary = searchResultForCategory2.data.find(
    (summary) => summary.id === product2.id,
  );

  TestValidator.predicate(
    "search results with category_code=categorySlug2 must contain product2",
    product2Summary !== undefined,
  );

  if (product2Summary !== undefined) {
    TestValidator.equals(
      "primaryCategoryName of product2 summary must match category2.name_en",
      product2Summary.primaryCategoryName ?? null,
      category2.name_en,
    );
  }

  const product1SummaryInCategory2 = searchResultForCategory2.data.find(
    (summary) => summary.id === product1.id,
  );

  TestValidator.predicate(
    "search results with category_code=categorySlug2 must NOT contain product1",
    product1SummaryInCategory2 === undefined,
  );

  // 9. Call search without category_code and ensure both products can appear
  const searchRequestWithoutCategory = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    cursor: undefined,
    search: undefined,
    status: undefined,
    seller_id: undefined,
    category_code: undefined,
    min_created_at: undefined,
    max_created_at: undefined,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallProduct.IRequest;

  const searchResultWithoutCategory: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: searchRequestWithoutCategory,
    });
  typia.assert(searchResultWithoutCategory);

  const product1SummaryNoCategory = searchResultWithoutCategory.data.find(
    (summary) => summary.id === product1.id,
  );
  const product2SummaryNoCategory = searchResultWithoutCategory.data.find(
    (summary) => summary.id === product2.id,
  );

  TestValidator.predicate(
    "search results without category_code should contain product1",
    product1SummaryNoCategory !== undefined,
  );
  TestValidator.predicate(
    "search results without category_code should contain product2",
    product2SummaryNoCategory !== undefined,
  );
}
