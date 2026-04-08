import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_customer_list_search_by_email_and_name(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with partial email matching
  const emailSearchRequest = {
    search: "john",
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallCustomer.IRequest;
  const emailSearchResults = await api.functional.ecommerceMall.customers.index(
    connection,
    { body: emailSearchRequest },
  );
  typia.assert(emailSearchResults);
  // Test 2: Search with display name partial match
  const displayNameRequest = {
    search: "Smith",
    page: 1,
    limit: 5,
  } satisfies IEcommerceMallCustomer.IRequest;
  const displayNameResults = await api.functional.ecommerceMall.customers.index(
    connection,
    { body: displayNameRequest },
  );
  typia.assert(displayNameResults);
  // Validate pagination respects limit
  TestValidator.predicate(
    "results respect pagination limit",
    displayNameResults.data.length <= displayNameRequest.limit,
  );
  // Test 3: Pagination verification with page 2
  const page2Request = {
    search: "test",
    page: 2,
    limit: 3,
  } satisfies IEcommerceMallCustomer.IRequest;
  const page2Results = await api.functional.ecommerceMall.customers.index(
    connection,
    { body: page2Request },
  );
  typia.assert(page2Results);
  // Validate page number is reflected in response
  TestValidator.equals(
    "current page matches request",
    page2Results.pagination.current,
    page2Request.page,
  );
  // Validate total records calculation for pagination
  TestValidator.predicate(
    "total pages calculated correctly",
    page2Results.pagination.pages ===
      Math.ceil(page2Results.pagination.records / page2Request.limit) ||
      page2Results.pagination.records === 0,
  );
  // Test 4: Empty search results validation
  const emptySearchRequest = {
    search: "nonexistentxyz123",
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallCustomer.IRequest;
  const emptyResults = await api.functional.ecommerceMall.customers.index(
    connection,
    { body: emptySearchRequest },
  );
  typia.assert(emptyResults);
  TestValidator.predicate(
    "empty search returns empty data array",
    emptyResults.data.length === 0,
  );
}
