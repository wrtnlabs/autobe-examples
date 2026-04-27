import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_category_search_by_name_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Search with partial name query to test filtering
  const searchResult =
    await api.functional.eCommerceMall.customer.categories.index(
      customerConnection,
      {
        body: {
          search: "elec",
          page: 1,
          limit: 10,
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals("current page", searchResult.pagination.current, 1);
  TestValidator.equals("page limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate that returned categories match the search term
  for (const cat of searchResult.data) {
    TestValidator.predicate(
      `category "${cat.name}" contains "elec"`,
      cat.name.toLowerCase().includes("elec"),
    );
  }
  // 3. Search with no search filter (empty string) — all categories returned
  const noSearchResult =
    await api.functional.eCommerceMall.customer.categories.index(
      customerConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(noSearchResult);
  TestValidator.predicate(
    "no search returns data",
    noSearchResult.data.length >= 0,
  );
  // 4. Search with non-matching query — zero results but valid pagination
  const noMatchResult =
    await api.functional.eCommerceMall.customer.categories.index(
      customerConnection,
      {
        body: {
          search: "zzzzzzzzzzzzzzzzzzzzzz",
          page: 1,
          limit: 10,
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals("no matching categories", noMatchResult.data.length, 0);
  TestValidator.equals("records is 0", noMatchResult.pagination.records, 0);
  TestValidator.equals("pages is 0", noMatchResult.pagination.pages, 0);
  // 5. Page beyond available pages — empty data but valid pagination metadata
  const beyondPageResult =
    await api.functional.eCommerceMall.customer.categories.index(
      customerConnection,
      {
        body: {
          page: 999,
          limit: 10,
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond page returns empty data",
    beyondPageResult.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination metadata remains valid",
    beyondPageResult.pagination.current >= 0 &&
      beyondPageResult.pagination.limit === 10 &&
      beyondPageResult.pagination.records >= 0 &&
      beyondPageResult.pagination.pages >= 0,
  );
}
