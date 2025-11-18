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

export async function test_api_customer_product_categories_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin joins (creates admin account) and is authenticated automatically.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.join.example.com" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create multiple categories (e.g., 6 categories) with varying sort_order.
  const categoryCount = 6;
  const createdCategories: IShoppingMallCategory[] = [];
  for (let i = 0; i < categoryCount; i++) {
    const categoryBody = {
      parent_id: null,
      slug: `cat-${i}-${RandomGenerator.alphaNumeric(8)}`,
      name_en: RandomGenerator.name(2),
      description_en: null,
      status: "active",
      sort_order: (i + 1) as number & tags.Type<"int32">,
      is_leaf: true,
    } satisfies IShoppingMallCategory.ICreate;

    const category: IShoppingMallCategory =
      await api.functional.shoppingMall.admin.categories.create(connection, {
        body: categoryBody,
      });
    typia.assert(category);
    createdCategories.push(category);
  }

  // 3. Seller joins and logs in, then creates a single product.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.join.example.com" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Seller product create uses seller auth context already stored in connection headers.
  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri: "https://images.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4. Switch back to admin (login) and create product-category links.
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.login.example.com" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // Create links: exactly one is_primary=true, others false.
  const primaryIndex = 0;
  const linkedCategories: IShoppingMallProductCategory[] = [];
  for (let i = 0; i < createdCategories.length; i++) {
    const category = createdCategories[i];
    const linkBody = {
      shopping_mall_category_id: category.id,
      is_primary: i === primaryIndex,
    } satisfies IShoppingMallProductCategory.ICreate;

    const link: IShoppingMallProductCategory =
      await api.functional.shoppingMall.admin.products.categories.create(
        connection,
        {
          productId: product.id,
          body: linkBody,
        },
      );
    typia.assert(link);
    linkedCategories.push(link);
  }

  // 5. Customer joins and logs in.
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://customer.join.example.com" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.login.example.com" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuthorized);

  // Helper to assert ascending sort_order in summaries.
  const assertAscending = (
    summary: IPageIShoppingMallProductCategory.ISummary,
  ) => {
    const sortOrders = summary.data.map((c) => c.sort_order);
    for (let i = 1; i < sortOrders.length; i++) {
      TestValidator.predicate(
        `ascending sort_order at index ${i}`,
        sortOrders[i - 1] <= sortOrders[i],
      );
    }
  };

  const assertDescending = (
    summary: IPageIShoppingMallProductCategory.ISummary,
  ) => {
    const sortOrders = summary.data.map((c) => c.sort_order);
    for (let i = 1; i < sortOrders.length; i++) {
      TestValidator.predicate(
        `descending sort_order at index ${i}`,
        sortOrders[i - 1] >= sortOrders[i],
      );
    }
  };

  // 6. Page 1, ascending by sort_order.
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 3 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const page1Body = {
    page,
    limit,
    orderBy: "sort_order",
    orderDirection: "asc",
  } satisfies IShoppingMallProductCategory.IRequest;

  const page1: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.customer.products.categories.index(
      connection,
      {
        productId: product.id,
        body: page1Body,
      },
    );
  typia.assert(page1);

  // Basic pagination checks for page 1.
  TestValidator.equals(
    "page1.current equals requested page",
    page1.pagination.current,
    page,
  );
  TestValidator.equals(
    "page1.limit equals requested limit",
    page1.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "page1.records equals number of linked categories",
    page1.pagination.records,
    linkedCategories.length,
  );
  const expectedPages = Math.ceil(linkedCategories.length / limit);
  TestValidator.equals(
    "page1.pages computed correctly",
    page1.pagination.pages,
    expectedPages as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "page1.data length equals min(limit, records)",
    page1.data.length,
    Math.min(limit, linkedCategories.length),
  );
  assertAscending(page1);

  // 7. Page 2, same ordering.
  const page2Body = {
    page: (page + 1) as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    orderBy: "sort_order",
    orderDirection: "asc",
  } satisfies IShoppingMallProductCategory.IRequest;

  const page2: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.customer.products.categories.index(
      connection,
      {
        productId: product.id,
        body: page2Body,
      },
    );
  typia.assert(page2);

  TestValidator.equals(
    "page2.current equals requested page",
    page2.pagination.current,
    page2Body.page,
  );
  TestValidator.equals(
    "page2.limit equals requested limit",
    page2.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "page2.records equals number of linked categories",
    page2.pagination.records,
    linkedCategories.length,
  );
  TestValidator.equals(
    "page2.pages matches page1.pages",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  assertAscending(page2);

  // Combine page1 and page2 sort_order to ensure they are consistent with full ordering.
  const combined = [...page1.data, ...page2.data];
  const combinedSortOrders = combined.map((c) => c.sort_order);
  for (let i = 1; i < combinedSortOrders.length; i++) {
    TestValidator.predicate(
      `combined ascending sort_order at index ${i}`,
      combinedSortOrders[i - 1] <= combinedSortOrders[i],
    );
  }

  // 8. Descending order, page 1.
  const descPage1Body = {
    page,
    limit,
    orderBy: "sort_order",
    orderDirection: "desc" as const,
  } satisfies IShoppingMallProductCategory.IRequest;

  const descPage1: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.customer.products.categories.index(
      connection,
      {
        productId: product.id,
        body: descPage1Body,
      },
    );
  typia.assert(descPage1);

  TestValidator.equals(
    "desc page1.current equals requested page",
    descPage1.pagination.current,
    descPage1Body.page,
  );
  TestValidator.equals(
    "desc page1.limit equals requested limit",
    descPage1.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "desc page1.records equals number of linked categories",
    descPage1.pagination.records,
    linkedCategories.length,
  );
  TestValidator.equals(
    "desc page1.pages matches asc page1.pages",
    descPage1.pagination.pages,
    page1.pagination.pages,
  );
  assertDescending(descPage1);

  // 9. Out-of-range page (pages + 1).
  const outOfRangePage = (page1.pagination.pages + 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const outOfRangeBody = {
    page: outOfRangePage,
    limit,
    orderBy: "sort_order",
    orderDirection: "asc" as const,
  } satisfies IShoppingMallProductCategory.IRequest;

  const outOfRange: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.customer.products.categories.index(
      connection,
      {
        productId: product.id,
        body: outOfRangeBody,
      },
    );
  typia.assert(outOfRange);

  TestValidator.equals(
    "out-of-range current equals requested page",
    outOfRange.pagination.current,
    outOfRangePage,
  );
  TestValidator.equals(
    "out-of-range limit equals requested limit",
    outOfRange.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "out-of-range records remains total linked categories",
    outOfRange.pagination.records,
    linkedCategories.length,
  );
  TestValidator.equals(
    "out-of-range pages remains same as before",
    outOfRange.pagination.pages,
    page1.pagination.pages,
  );
  TestValidator.equals(
    "out-of-range data array is empty",
    outOfRange.data.length,
    0,
  );
}
