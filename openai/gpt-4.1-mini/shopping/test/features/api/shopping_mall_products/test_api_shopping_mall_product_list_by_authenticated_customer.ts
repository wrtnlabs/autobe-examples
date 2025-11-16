import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function test_api_shopping_mall_product_list_by_authenticated_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins the shopping mall and authenticates
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    href: "https://example.com/signup",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: createBody });
  typia.assert(customer);

  // 2. Perform product listing with no filters to get first page
  const baseSearchBody = {
    page: 1,
    limit: 5,
  } satisfies IShoppingMallProduct.IRequest;
  const resultDefault: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.customer.shoppingMallProducts.index(
      connection,
      { body: baseSearchBody },
    );
  typia.assert(resultDefault);
  TestValidator.predicate(
    "default search returns pagination and data",
    resultDefault.data.length <= baseSearchBody.limit &&
      resultDefault.pagination.current === baseSearchBody.page &&
      resultDefault.pagination.limit === baseSearchBody.limit,
  );

  // 3. Test filtering by some random product code from result if available
  if (resultDefault.data.length > 0) {
    const codeToSearch = resultDefault.data[0].code;
    const filterCodeBody = {
      page: 1,
      limit: 10,
      searchProductCode: codeToSearch,
    } satisfies IShoppingMallProduct.IRequest;
    const resultByCode: IPageIShoppingMallProduct.ISummary =
      await api.functional.shoppingMall.customer.shoppingMallProducts.index(
        connection,
        { body: filterCodeBody },
      );
    typia.assert(resultByCode);
    TestValidator.predicate(
      "filter by product code returns only products with matched code",
      resultByCode.data.every((p) => p.code === codeToSearch),
    );
  }

  // 4. Test filtering by product name substring from result if available
  if (resultDefault.data.length > 0) {
    const nameToSearch = resultDefault.data[0].name.slice(0, 3);
    const filterNameBody = {
      page: 1,
      limit: 10,
      searchProductName: nameToSearch,
    } satisfies IShoppingMallProduct.IRequest;
    const resultByName: IPageIShoppingMallProduct.ISummary =
      await api.functional.shoppingMall.customer.shoppingMallProducts.index(
        connection,
        { body: filterNameBody },
      );
    typia.assert(resultByName);
    TestValidator.predicate(
      "filter by product name substring returns only products whose name includes the substring",
      resultByName.data.every((p) => p.name.includes(nameToSearch)),
    );
  }

  // 5. Test filtering by product description substring
  // Note: Since there is no description property in summary, only filter by sending value
  const descriptionSearchText = "sample";
  const filterDescriptionBody = {
    page: 1,
    limit: 10,
    searchDescription: descriptionSearchText,
  } satisfies IShoppingMallProduct.IRequest;
  const resultByDescription: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.customer.shoppingMallProducts.index(
      connection,
      { body: filterDescriptionBody },
    );
  typia.assert(resultByDescription);
  // Cannot check description in summary since it's not present, just check pagination/limit
  TestValidator.predicate(
    "search by description returns pagination and data",
    Array.isArray(resultByDescription.data) &&
      resultByDescription.pagination.limit === filterDescriptionBody.limit,
  );

  // 6. Test filtering only active products
  const filterActiveBody = {
    page: 1,
    limit: 10,
    searchIsActive: true,
  } satisfies IShoppingMallProduct.IRequest;
  const resultActive: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.customer.shoppingMallProducts.index(
      connection,
      { body: filterActiveBody },
    );
  typia.assert(resultActive);
  TestValidator.predicate(
    "all products in active filter are active",
    resultActive.data.every((p) => p.is_active === true),
  );

  // 7. Test pagination: request page 2 from previous
  if (resultDefault.pagination.pages >= 2) {
    const page2Body = {
      page: 2,
      limit: 5,
    } satisfies IShoppingMallProduct.IRequest;
    const resultPage2: IPageIShoppingMallProduct.ISummary =
      await api.functional.shoppingMall.customer.shoppingMallProducts.index(
        connection,
        { body: page2Body },
      );
    typia.assert(resultPage2);
    TestValidator.predicate(
      "pagination should provide correct current page",
      resultPage2.pagination.current === 2,
    );
  }
}
