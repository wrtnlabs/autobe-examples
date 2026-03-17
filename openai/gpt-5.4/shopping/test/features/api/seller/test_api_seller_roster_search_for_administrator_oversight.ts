import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_roster_search_for_administrator_oversight(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const body = {
    approval_status: "approved",
    suspended: false,
    banned: false,
    search: "a",
    page: 1,
    limit: 10,
    sort: "email",
  } satisfies IShoppingMallSeller.IRequest;
  const response: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.sellers.index(administratorConnection, {
      body,
    });
  typia.assert(response);
  TestValidator.equals(
    "pagination.current matches requested page",
    response.pagination.current,
    body.page ?? 1,
  );
  TestValidator.equals(
    "pagination.limit matches requested limit",
    response.pagination.limit,
    body.limit ?? response.pagination.limit,
  );
  TestValidator.predicate(
    "pagination.records covers returned data length",
    response.pagination.records >= response.data.length,
  );
  TestValidator.equals(
    "pagination.pages matches records and limit",
    response.pagination.pages,
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit),
  );
  TestValidator.predicate(
    "pagination.current is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "current page data length respects pagination limit",
    response.data.length <= response.pagination.limit,
  );
  for (const row of response.data) {
    typia.assert(row);
    typia.assertEquals<IShoppingMallSeller.ISummary>({
      id: row.id,
      email: row.email,
      approval_status: row.approval_status,
      rejection_reason: row.rejection_reason,
      suspended: row.suspended,
      banned: row.banned,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    });
    TestValidator.equals(
      "row suspended filter matches request",
      row.suspended,
      body.suspended,
    );
    TestValidator.equals(
      "row banned filter matches request",
      row.banned,
      body.banned,
    );
    TestValidator.equals(
      "row approval_status filter matches request",
      row.approval_status,
      body.approval_status,
    );
    if ((body.search ?? "").length !== 0) {
      TestValidator.predicate(
        "row email matches search text",
        row.email.toLowerCase().includes((body.search ?? "").toLowerCase()),
      );
    }
  }
  for (let i = 1; i < response.data.length; ++i) {
    const previous = response.data[i - 1];
    const current = response.data[i];
    const emailOrdered =
      previous.email < current.email ||
      (previous.email === current.email && previous.id <= current.id);
    TestValidator.predicate(
      "rows are ordered by email with id tie-breaker",
      emailOrdered,
    );
  }
}
