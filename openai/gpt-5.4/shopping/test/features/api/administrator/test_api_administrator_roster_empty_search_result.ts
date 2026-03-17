import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_administrator_roster_empty_search_result(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
  };
  const body = {
    search: `no-match-${RandomGenerator.alphaNumeric(16)}@example.com`,
    active: true,
    banned: true,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAdministrator.IRequest;
  const page = await api.functional.shoppingMall.administrators.index(
    administratorConnection,
    { body },
  );
  typia.assert(page);
  TestValidator.equals("empty data array", page.data.length, 0);
  TestValidator.equals(
    "pagination current page preserved",
    page.pagination.current,
    body.page,
  );
  TestValidator.equals(
    "pagination limit preserved",
    page.pagination.limit,
    body.limit,
  );
  TestValidator.equals(
    "empty result has zero records",
    page.pagination.records,
    0,
  );
  TestValidator.equals("empty result has zero pages", page.pagination.pages, 0);
}
