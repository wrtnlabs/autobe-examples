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

export async function test_api_administrator_roster_browse_governance(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
  };
  const request = {
    search: "admin",
    active: true,
    banned: false,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAdministrator.IRequest;
  const firstPage = await api.functional.shoppingMall.administrators.index(
    administratorConnection,
    {
      body: request,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "first pagination current is non-negative",
    firstPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "first pagination limit is non-negative",
    firstPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "first pagination records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first pagination pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data length does not exceed limit when limit is positive",
    firstPage.pagination.limit === 0 ||
      firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.equals(
    "returned current page matches requested page",
    firstPage.pagination.current,
    request.page,
  );
  for (const administrator of firstPage.data) {
    typia.assert(administrator);
    TestValidator.predicate(
      "administrator summary has no sensitive extra fields",
      typia.equals<IShoppingMallAdministrator.ISummary>(administrator),
    );
    TestValidator.predicate(
      "administrator grade is governance grade",
      administrator.grade === "administrator" ||
        administrator.grade === "superAdministrator",
    );
  }
  const secondPage = await api.functional.shoppingMall.administrators.index(
    administratorConnection,
    {
      body: request,
    },
  );
  typia.assert(secondPage);
  TestValidator.predicate(
    "second pagination current is non-negative",
    secondPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "second pagination limit is non-negative",
    secondPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "second pagination records is non-negative",
    secondPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "second pagination pages is non-negative",
    secondPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "second page data length does not exceed limit when limit is positive",
    secondPage.pagination.limit === 0 ||
      secondPage.data.length <= secondPage.pagination.limit,
  );
  const firstById = new Map<string, IShoppingMallAdministrator.ISummary>(
    firstPage.data.map((administrator) => [administrator.id, administrator]),
  );
  for (const administrator of secondPage.data) {
    const previous = firstById.get(administrator.id);
    if (previous === undefined) continue;
    TestValidator.equals(
      "email is stable across repeated governance listing",
      administrator.email,
      previous.email,
    );
    TestValidator.equals(
      "grade is stable across repeated governance listing",
      administrator.grade,
      previous.grade,
    );
    TestValidator.equals(
      "active is stable across repeated governance listing",
      administrator.active,
      previous.active,
    );
    TestValidator.equals(
      "banned is stable across repeated governance listing",
      administrator.banned,
      previous.banned,
    );
    TestValidator.equals(
      "created_at is stable across repeated governance listing",
      administrator.created_at,
      previous.created_at,
    );
    TestValidator.equals(
      "updated_at is stable across repeated governance listing",
      administrator.updated_at,
      previous.updated_at,
    );
    TestValidator.equals(
      "deleted_at is stable across repeated governance listing",
      administrator.deleted_at,
      previous.deleted_at,
    );
  }
}
