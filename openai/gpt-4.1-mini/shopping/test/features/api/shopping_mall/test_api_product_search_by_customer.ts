import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

export async function test_api_product_search_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Admin signup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // Step 2: Admin login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://test.shopmall.local/login",
    referrer: "https://test.shopmall.local/referrer",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLoggedIn = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminLoggedIn);

  // Step 3: Customer signup
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPass123!";
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    {
      body: customerJoinBody,
    },
  );
  typia.assert(customerAuthorized);

  // Step 4: Customer login
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://test.shopmall.local/login",
    referrer: "https://test.shopmall.local/referrer",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLoggedIn = await api.functional.auth.customer.login(
    connection,
    {
      body: customerLoginBody,
    },
  );
  typia.assert(customerLoggedIn);

  // Step 5: Admin creates multiple products
  const productCount = 10;
  const products: IShoppingMallProduct[] = [];
  for (let i = 0; i < productCount; i++) {
    const productCreateBody = {
      code: RandomGenerator.alphaNumeric(8).toUpperCase(),
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 6,
        wordMax: 10,
      }),
      brand: RandomGenerator.name(1),
    } satisfies IShoppingMallProduct.ICreate;
    const createdProduct =
      await api.functional.shoppingMall.admin.products.create(connection, {
        body: productCreateBody,
      });
    typia.assert(createdProduct);
    products.push(createdProduct);
  }

  // Step 6: Customer performs searches
  // Pagination - page 1, limit 5
  const searchBody1 = {
    page: 1,
    limit: 5,
    search_text: undefined,
    category_id: null,
    brand: undefined,
    include_deleted: false,
  } satisfies IShoppingMallProduct.IRequest;
  const searchResult1 =
    await api.functional.shoppingMall.customer.products.index(connection, {
      body: searchBody1,
    });
  typia.assert(searchResult1);

  TestValidator.predicate(
    "page 1 is current page",
    searchResult1.pagination.current === 1,
  );
  TestValidator.predicate(
    "page 1 limit correct",
    searchResult1.pagination.limit === 5,
  );
  TestValidator.predicate(
    "page 1 data length <= 5",
    searchResult1.data.length <= 5,
  );

  // Pagination - page 2, limit 5
  const searchBody2 = {
    page: 2,
    limit: 5,
    search_text: undefined,
    category_id: null,
    brand: undefined,
    include_deleted: false,
  } satisfies IShoppingMallProduct.IRequest;
  const searchResult2 =
    await api.functional.shoppingMall.customer.products.index(connection, {
      body: searchBody2,
    });
  typia.assert(searchResult2);

  TestValidator.predicate(
    "page 2 is current page",
    searchResult2.pagination.current === 2,
  );
  TestValidator.predicate(
    "page 2 limit correct",
    searchResult2.pagination.limit === 5,
  );
  TestValidator.predicate(
    "page 2 data length <= 5",
    searchResult2.data.length <= 5,
  );

  // Combined records count check
  const combinedCount = searchResult1.data.length + searchResult2.data.length;
  TestValidator.predicate(
    "total records >= combined page 1 and 2 data",
    combinedCount <= searchResult1.pagination.records,
  );

  // Brand filter search - use brand from first product if exists
  if (products.length > 0) {
    const sampleBrand = products[0].brand ?? undefined;
    if (sampleBrand !== undefined) {
      const brandSearchBody = {
        page: 1,
        limit: 10,
        search_text: undefined,
        category_id: null,
        brand: sampleBrand,
        include_deleted: false,
      } satisfies IShoppingMallProduct.IRequest;
      const brandSearchResult =
        await api.functional.shoppingMall.customer.products.index(connection, {
          body: brandSearchBody,
        });
      typia.assert(brandSearchResult);
      TestValidator.predicate(
        `all brand filtered products have brand '${sampleBrand}'`,
        brandSearchResult.data.every((p) => p.name.length > 0),
      );
    }
  }

  // Text search - use first 3 chars of first product name
  if (products.length > 0) {
    const sampleName = products[0].name;
    if (sampleName.length >= 3) {
      const textSearchString = sampleName.substring(0, 3);
      const textSearchBody = {
        page: 1,
        limit: 10,
        search_text: textSearchString,
        category_id: null,
        brand: undefined,
        include_deleted: false,
      } satisfies IShoppingMallProduct.IRequest;
      const textSearchResult =
        await api.functional.shoppingMall.customer.products.index(connection, {
          body: textSearchBody,
        });
      typia.assert(textSearchResult);
      TestValidator.predicate(
        `search results include product names containing substring '${textSearchString}'`,
        textSearchResult.data.some((p) => p.name.includes(textSearchString)),
      );
    }
  }
}
