import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_super_administrator_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test paginated search for super administrators
  const request: IEcommerceSuperAdministrator.IRequest = {
    page: 1 satisfies number,
    limit: 20 satisfies number,
  };
  const response = await api.functional.ecommerce.super_administrators.index(
    connection,
    {
      body: request,
    },
  );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    response.pagination.pages >= 0,
  );
  // Validate pagination calculation: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation should be correct",
    response.pagination.pages,
    expectedPages,
  );
  // Validate data array structure
  for (const admin of response.data) {
    typia.assert(admin);
  }
  // Validate data count matches pagination limit (except for last page)
  if (response.pagination.current < response.pagination.pages) {
    TestValidator.equals(
      "data count should match limit on non-last page",
      response.data.length,
      response.pagination.limit,
    );
  } else {
    TestValidator.predicate(
      "data count should be <= limit on last page",
      response.data.length <= response.pagination.limit,
    );
  }
}
