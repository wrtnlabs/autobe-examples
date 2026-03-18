import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_guests_paginated_listing(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, { body: {} });
  const firstRequest = {
    page: 1,
    limit: 10,
    sort: "createdAt",
  } satisfies IHrmTimeTrackingGuest.IRequest;
  const firstPage = await api.functional.hrmTimeTracking.guest.guests.index(
    guestConnection,
    { body: firstRequest },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current matches requested page",
    firstPage.pagination.current,
    firstRequest.page,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    firstPage.pagination.limit,
    firstRequest.limit,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination page count matches record math",
    firstPage.pagination.pages,
    firstPage.pagination.limit > 0
      ? Math.ceil(firstPage.pagination.records / firstPage.pagination.limit)
      : 0,
  );
  for (const row of firstPage.data) typia.assert(row);
  const repeatedPage = await api.functional.hrmTimeTracking.guest.guests.index(
    guestConnection,
    { body: firstRequest },
  );
  typia.assert(repeatedPage);
  TestValidator.equals(
    "same request returns stable guest ordering",
    repeatedPage.data.map((item) => item.id),
    firstPage.data.map((item) => item.id),
  );
  if (firstPage.pagination.pages > 1) {
    const secondRequest = {
      page: 2,
      limit: 10,
      sort: "createdAt",
    } satisfies IHrmTimeTrackingGuest.IRequest;
    const secondPage = await api.functional.hrmTimeTracking.guest.guests.index(
      guestConnection,
      { body: secondRequest },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current matches requested page",
      secondPage.pagination.current,
      secondRequest.page,
    );
    TestValidator.equals(
      "second page limit matches requested limit",
      secondPage.pagination.limit,
      secondRequest.limit,
    );
    TestValidator.predicate(
      "second page is not empty when multiple pages exist",
      secondPage.data.length > 0,
    );
    TestValidator.notEquals(
      "page one and page two must differ when multiple pages exist",
      firstPage.data.map((item) => item.id),
      secondPage.data.map((item) => item.id),
    );
    for (const row of secondPage.data) typia.assert(row);
  }
  const sortedByIdRequest = {
    page: 1,
    limit: 100,
    sort: "id",
  } satisfies IHrmTimeTrackingGuest.IRequest;
  const sortedByIdPage =
    await api.functional.hrmTimeTracking.guest.guests.index(guestConnection, {
      body: sortedByIdRequest,
    });
  typia.assert(sortedByIdPage);
  TestValidator.equals(
    "sort by id request keeps requested page",
    sortedByIdPage.pagination.current,
    sortedByIdRequest.page,
  );
  TestValidator.equals(
    "sort by id request keeps requested limit",
    sortedByIdPage.pagination.limit,
    sortedByIdRequest.limit,
  );
  for (const row of sortedByIdPage.data) typia.assert(row);
}
