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
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_customer_product_categories_visible_after_assignment(
  connection: api.IConnection,
) {
  // 1. Admin signs up (join) and becomes authenticated admin actor
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Admin creates two active leaf categories
  const categoryBody1 = {
    parent_id: null,
    slug: `electronics-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Electronics",
    description_en: "Electronics category for gadgets",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody1,
    });
  typia.assert<IShoppingMallCategory>(category1);

  const categoryBody2 = {
    parent_id: null,
    slug: `accessories-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Accessories",
    description_en: "Accessories category for add-ons",
    status: "active",
    sort_order: 2 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody2,
    });
  typia.assert<IShoppingMallCategory>(category2);

  // 3. Seller joins and becomes authenticated seller actor
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 4. Seller creates a product
  const productBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "BrandCo",
    model_name: "Model-X",
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/product-primary.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 5. Switch back to admin using login to create product-category links
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedIn);

  const primaryLinkBody = {
    shopping_mall_category_id: category1.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const primaryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: primaryLinkBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(primaryLink);

  const secondaryLinkBody = {
    shopping_mall_category_id: category2.id,
    is_primary: false,
  } satisfies IShoppingMallProductCategory.ICreate;

  const secondaryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: secondaryLinkBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(secondaryLink);

  // 6. Customer joins and becomes authenticated customer actor
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.shoppingmall.test/join",
    referrer: "https://customer.shoppingmall.test/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 7. Customer queries categories for the product via customer endpoint
  const requestPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestLimit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestBody = {
    page: requestPage,
    limit: requestLimit,
    orderBy: "sort_order",
    orderDirection: "asc",
    categoryCodes: undefined,
    isPrimary: null,
  } satisfies IShoppingMallProductCategory.IRequest;

  const page: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.customer.products.categories.index(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallProductCategory.ISummary>(page);

  // 8. Validate that categories linked to the product are visible to customer
  const categoryIdsInResponse = page.data.map((summary) => summary.id);

  TestValidator.predicate(
    "response must contain at least the two linked categories",
    categoryIdsInResponse.includes(category1.id) &&
      categoryIdsInResponse.includes(category2.id),
  );

  const respCategory1 = page.data.find(
    (summary) => summary.id === category1.id,
  );
  const respCategory2 = page.data.find(
    (summary) => summary.id === category2.id,
  );

  TestValidator.predicate(
    "response should contain summary for first category",
    respCategory1 !== undefined,
  );
  TestValidator.predicate(
    "response should contain summary for second category",
    respCategory2 !== undefined,
  );

  if (respCategory1 !== undefined) {
    TestValidator.equals(
      "category1 slug should match",
      respCategory1.slug,
      category1.slug,
    );
    TestValidator.equals(
      "category1 name_en should match",
      respCategory1.name_en,
      category1.name_en,
    );
    TestValidator.equals(
      "category1 status should be active",
      respCategory1.status,
      category1.status,
    );
    TestValidator.equals(
      "category1 is_leaf should match",
      respCategory1.is_leaf,
      category1.is_leaf,
    );
    TestValidator.equals(
      "category1 sort_order should match",
      respCategory1.sort_order,
      category1.sort_order,
    );
  }

  if (respCategory2 !== undefined) {
    TestValidator.equals(
      "category2 slug should match",
      respCategory2.slug,
      category2.slug,
    );
    TestValidator.equals(
      "category2 name_en should match",
      respCategory2.name_en,
      category2.name_en,
    );
    TestValidator.equals(
      "category2 status should be active",
      respCategory2.status,
      category2.status,
    );
    TestValidator.equals(
      "category2 is_leaf should match",
      respCategory2.is_leaf,
      category2.is_leaf,
    );
    TestValidator.equals(
      "category2 sort_order should match",
      respCategory2.sort_order,
      category2.sort_order,
    );
  }

  // 9. Validate pagination metadata consistency
  const pagination = page.pagination;

  TestValidator.equals(
    "pagination current page should match request",
    pagination.current,
    requestPage,
  );
  TestValidator.equals(
    "pagination limit should match request",
    pagination.limit,
    requestLimit,
  );
  TestValidator.predicate(
    "pagination records should be at least number of linked categories",
    pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1",
    pagination.pages >= 1,
  );
}
