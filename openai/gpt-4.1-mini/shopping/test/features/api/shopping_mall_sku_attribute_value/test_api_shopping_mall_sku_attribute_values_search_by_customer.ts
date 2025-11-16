import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuAttributeValue";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeValue";

export async function test_api_shopping_mall_sku_attribute_values_search_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer using the join endpoint to obtain authentication tokens.
  const customerCreateRequest = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password: "strong_password",
    full_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://example.com/signup",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateRequest,
    });
  typia.assert(customer);

  // 2. Define several search request bodies with filters and pagination
  const searchRequests: IShoppingMallSkuAttributeValue.IRequest[] = [];

  // 2-1. Search with attribute_code only
  searchRequests.push({
    attribute_code: "color",
    limit: 5,
    offset: 0,
    sort_by: "code",
    sort_order: "asc",
  } satisfies IShoppingMallSkuAttributeValue.IRequest);

  // 2-2. Search with label containing "Blue" (substring)
  searchRequests.push({
    label: "Blue",
    limit: 10,
    offset: 0,
    is_active: true,
  } satisfies IShoppingMallSkuAttributeValue.IRequest);

  // 2-3. Search all active values with pagination offset
  searchRequests.push({
    is_active: true,
    limit: 3,
    offset: 1,
  } satisfies IShoppingMallSkuAttributeValue.IRequest);

  // 2-4. Search with code filter exact
  searchRequests.push({
    code: "red",
    limit: 5,
    offset: 0,
  } satisfies IShoppingMallSkuAttributeValue.IRequest);

  // 3. For each search request, retrieve paged SKU attribute values and validate
  for (const requestBody of searchRequests) {
    const response: IPageIShoppingMallSkuAttributeValue.ISummary =
      await api.functional.shoppingMall.customer.shoppingMallSkuAttributeValues.index(
        connection,
        { body: requestBody },
      );
    typia.assert(response);

    // Validate pagination limit and offset are respected (if present)
    if (requestBody.limit !== undefined) {
      TestValidator.predicate(
        "limit respected",
        response.pagination.limit <= requestBody.limit,
      );
    }
    if (requestBody.offset !== undefined) {
      TestValidator.predicate(
        "offset non-negative",
        response.pagination.current >= 0,
      );
    }

    // Validate returned data matches filters where applicable (attribute_code, label substring, code exact, is_active)
    for (const item of response.data) {
      typia.assert(item);
      if (requestBody.attribute_code !== undefined) {
        // We can't directly assert attribute_code because not returned, so we skip
      }
      if (requestBody.label !== undefined) {
        TestValidator.predicate(
          `label contains ${requestBody.label}`,
          item.value.toLowerCase().includes(requestBody.label.toLowerCase()),
        );
      }
      if (requestBody.code !== undefined) {
        TestValidator.predicate(
          `code exact match`,
          item.value.toLowerCase() === requestBody.code.toLowerCase(),
        );
      }
      if (requestBody.is_active !== undefined) {
        // We don't have is_active in summary, so we skip
      }
    }
  }
}
