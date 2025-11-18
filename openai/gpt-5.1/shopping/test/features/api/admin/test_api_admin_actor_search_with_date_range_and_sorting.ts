import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallActorSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallActorSearch";
import type { IShoppingMallActorSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSearch";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_admin_actor_search_with_date_range_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authorized context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Build a registration date range: from 30 days ago to now.
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - thirtyDaysMs);
  const registeredFrom = fromDate.toISOString();
  const registeredTo = now.toISOString();

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const searchRequestBody = {
    query: null,
    actor_types: null,
    emails: null,
    phone_numbers: null,
    status: null,
    registered_from: registeredFrom,
    registered_to: registeredTo,
    page,
    limit,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingMallActorSearch.IRequest;

  const pageResult: IPageIShoppingMallActorSearch.ISummary =
    await api.functional.shoppingMall.admin.actors.search.index(connection, {
      body: searchRequestBody,
    });
  typia.assert(pageResult);

  const { pagination, data } = pageResult;

  // 3. Pagination sanity checks.
  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should match request limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination.records should be >= data.length",
    pagination.records >= (data.length as number),
  );

  if (pagination.records === 0) {
    TestValidator.equals(
      "when no records, pages should be 0",
      pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "when records > 0, pages should be >= 1",
      pagination.pages >= 1,
    );
  }

  // 4. Validate date range and sorting when there is at least one actor.
  if (data.length === 0) return;

  const fromMillis = new Date(registeredFrom).getTime();
  const toMillis = new Date(registeredTo).getTime();

  // Every actor must have createdAt within [registeredFrom, registeredTo].
  for (const actor of data) {
    const createdMillis = new Date(actor.createdAt).getTime();
    TestValidator.predicate(
      "actor.createdAt should be within requested date range",
      createdMillis >= fromMillis && createdMillis <= toMillis,
    );
  }

  // If more than one actor, verify descending ordering by createdAt.
  if (data.length >= 2) {
    for (let i = 1; i < data.length; ++i) {
      const prev = new Date(data[i - 1].createdAt).getTime();
      const curr = new Date(data[i].createdAt).getTime();
      TestValidator.predicate(
        "results should be sorted by createdAt desc (non-increasing order)",
        prev >= curr,
      );
    }
  }
}
