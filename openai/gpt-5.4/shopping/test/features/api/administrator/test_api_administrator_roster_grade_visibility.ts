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

export async function test_api_administrator_roster_grade_visibility(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const page = 1;
  const limit = 10;
  const request = {
    search: "admin",
    active: true,
    banned: false,
    page,
    limit,
  } satisfies IShoppingMallAdministrator.IRequest;
  const firstPage = await api.functional.shoppingMall.administrators.index(
    administratorConnection,
    {
      body: request,
    },
  );
  typia.assert<IPageIShoppingMallAdministrator.ISummary>(firstPage);
  TestValidator.equals(
    "current page matches request",
    firstPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "page limit matches request",
    firstPage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "data length does not exceed requested limit",
    firstPage.data.length <= limit,
  );
  TestValidator.predicate(
    "all roster items match active filter",
    firstPage.data.every((administrator) => administrator.active === true),
  );
  TestValidator.predicate(
    "all roster items match banned filter",
    firstPage.data.every((administrator) => administrator.banned === false),
  );
  TestValidator.predicate(
    "all roster items expose effective governance grade",
    firstPage.data.every(
      (administrator) =>
        administrator.grade === "administrator" ||
        administrator.grade === "superAdministrator",
    ),
  );
  const secondPage = await api.functional.shoppingMall.administrators.index(
    administratorConnection,
    {
      body: request,
    },
  );
  typia.assert<IPageIShoppingMallAdministrator.ISummary>(secondPage);
  TestValidator.equals(
    "second page current matches request",
    secondPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "second page limit matches request",
    secondPage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "second page data length does not exceed requested limit",
    secondPage.data.length <= limit,
  );
  TestValidator.predicate(
    "second page preserves active filter context",
    secondPage.data.every((administrator) => administrator.active === true),
  );
  TestValidator.predicate(
    "second page preserves banned filter context",
    secondPage.data.every((administrator) => administrator.banned === false),
  );
  TestValidator.predicate(
    "second page preserves grade visibility",
    secondPage.data.every(
      (administrator) =>
        administrator.grade === "administrator" ||
        administrator.grade === "superAdministrator",
    ),
  );
}
