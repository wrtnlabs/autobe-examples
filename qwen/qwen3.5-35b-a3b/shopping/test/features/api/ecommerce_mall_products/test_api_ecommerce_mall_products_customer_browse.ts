import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_ecommerce_mall_products_customer_browse(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() as string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() as string,
      referrer: typia.random<string & tags.Format<"uri">>() as string,
    },
  });
  typia.assert(authorized);
  typia.assert(authorized.token);
  // 2. Test default browsing (no filters) - should return active products sorted by created_at desc
  const defaultPage = await api.functional.ecommerceMall.products.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page current",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default page limit", defaultPage.pagination.limit, 20);
  TestValidator.predicate(
    "has pagination",
    defaultPage.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "has pages",
    defaultPage.pagination.pages !== undefined,
  );
  // 3. Validate product structure in response
  if (defaultPage.data.length > 0) {
    const product = defaultPage.data[0];
    typia.assert(product);
    TestValidator.equals("product has id", product.id !== undefined, true);
    TestValidator.equals(
      "product has name",
      typeof product.name === "string",
      true,
    );
    TestValidator.equals(
      "product has basePrice",
      typeof product.basePrice === "number",
      true,
    );
    TestValidator.equals(
      "product has category",
      product.category !== undefined,
      true,
    );
    TestValidator.equals(
      "product has seller",
      product.seller !== undefined,
      true,
    );
    TestValidator.equals(
      "product has isActive",
      typeof product.isActive === "boolean",
      true,
    );
    TestValidator.predicate("product is active", product.isActive === true);
    // Validate category structure
    typia.assert(product.category);
    TestValidator.equals(
      "category has id",
      product.category.id !== undefined,
      true,
    );
    TestValidator.equals(
      "category has name",
      typeof product.category.name === "string",
      true,
    );
    // Validate seller structure
    typia.assert(product.seller);
    TestValidator.equals(
      "seller has id",
      product.seller.id !== undefined,
      true,
    );
    TestValidator.equals(
      "seller has email",
      product.seller.email !== undefined,
      true,
    );
    TestValidator.equals(
      "seller has approvalStatus",
      product.seller.approvalStatus !== undefined,
      true,
    );
  }
  // 4. Test category filtering
  const testCategoryId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string;
  const categoryFilterPage = await api.functional.ecommerceMall.products.index(
    customerConnection,
    {
      body: {
        category_id: testCategoryId,
      },
    },
  );
  typia.assert(categoryFilterPage);
  TestValidator.equals(
    "category filter pagination current",
    categoryFilterPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "category filter pagination has records",
    categoryFilterPage.pagination.records !== undefined,
  );
  // Validate category filter returns only products in that category
  for (const product of categoryFilterPage.data) {
    typia.assert(product);
    TestValidator.equals(
      `product ${product.id} belongs to filtered category`,
      product.category.id,
      testCategoryId,
    );
  }
  // 5. Test name search
  const searchPhrase = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 6,
  });
  const searchPage = await api.functional.ecommerceMall.products.index(
    customerConnection,
    {
      body: {
        name_search: searchPhrase,
      },
    },
  );
  typia.assert(searchPage);
  TestValidator.equals(
    "search pagination current",
    searchPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "search pagination has records",
    searchPage.pagination.records !== undefined,
  );
  // Validate search returns products matching the name
  for (const product of searchPage.data) {
    typia.assert(product);
    TestValidator.predicate(
      `product ${product.id} name contains search term`,
      product.name.toLowerCase().includes(searchPhrase.toLowerCase()),
    );
  }
  // 6. Test sorting by base_price ascending
  const priceAscPage = await api.functional.ecommerceMall.products.index(
    customerConnection,
    {
      body: {
        sort_by: "base_price",
        sort_direction: "asc",
      },
    },
  );
  typia.assert(priceAscPage);
  // Validate ascending order
  for (let i = 1; i < priceAscPage.data.length; i++) {
    const prevProduct = priceAscPage.data[i - 1];
    const currProduct = priceAscPage.data[i];
    typia.assert(prevProduct);
    typia.assert(currProduct);
    TestValidator.predicate(
      `price ascending order at index ${i}`,
      currProduct.basePrice >= prevProduct.basePrice,
    );
  }
  // 7. Test sorting by base_price descending
  const priceDescPage = await api.functional.ecommerceMall.products.index(
    customerConnection,
    {
      body: {
        sort_by: "base_price",
        sort_direction: "desc",
      },
    },
  );
  typia.assert(priceDescPage);
  // Validate descending order
  for (let i = 1; i < priceDescPage.data.length; i++) {
    const prevProduct = priceAscPage.data[i - 1];
    const currProduct = priceDescPage.data[i];
    typia.assert(prevProduct);
    typia.assert(currProduct);
    TestValidator.predicate(
      `price descending order at index ${i}`,
      currProduct.basePrice <= prevProduct.basePrice,
    );
  }
  // 8. Test sorting by name
  const nameSortPage = await api.functional.ecommerceMall.products.index(
    customerConnection,
    {
      body: {
        sort_by: "name",
        sort_direction: "asc",
      },
    },
  );
  typia.assert(nameSortPage);
  // Validate name ascending order
  for (let i = 1; i < nameSortPage.data.length; i++) {
    const prevProduct = nameSortPage.data[i - 1];
    const currProduct = nameSortPage.data[i];
    typia.assert(prevProduct);
    typia.assert(currProduct);
    TestValidator.predicate(
      `name ascending order at index ${i}`,
      currProduct.name.localeCompare(prevProduct.name) >= 0,
    );
  }
  // 9. Test pagination with custom page and limit
  const customPage = await api.functional.ecommerceMall.products.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 10,
      },
    },
  );
  typia.assert(customPage);
  TestValidator.equals("custom page current", customPage.pagination.current, 2);
  TestValidator.equals("custom page limit", customPage.pagination.limit, 10);
  TestValidator.predicate(
    "custom page has records",
    customPage.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "custom page has pages",
    customPage.pagination.pages !== undefined,
  );
  // 10. Test page beyond available pages
  const outOfRangePage = await api.functional.ecommerceMall.products.index(
    customerConnection,
    {
      body: {
        page: 9999,
      },
    },
  );
  typia.assert(outOfRangePage);
  TestValidator.equals(
    "out of range page current",
    outOfRangePage.pagination.current,
    9999,
  );
  TestValidator.predicate(
    "out of range page has 0 records",
    outOfRangePage.pagination.records === 0 || outOfRangePage.data.length === 0,
  );
}