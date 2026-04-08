import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_guest_super_admin_query_with_date_range_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super admin account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  // 2. Get baseline data without filters
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  // Test with both createdAt start and end filters
  const resultWithBothFilters =
    await api.functional.ecommerceMall.superAdmin.guests.index(
      superAdminConnection,
      {
        body: {
          createdAtStart: oneHourAgo.toISOString(),
          createdAtEnd: oneHourLater.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallGuest.IRequest,
      },
    );
  typia.assert(resultWithBothFilters);
  // Validate all returned guests are within date range
  for (const guest of resultWithBothFilters.data) {
    TestValidator.predicate(
      "guest createdAt within range",
      new Date(guest.createdAt) >= oneHourAgo &&
        new Date(guest.createdAt) <= oneHourLater,
    );
  }
  // 3. Test with only start date filter
  const resultWithStartFilter =
    await api.functional.ecommerceMall.superAdmin.guests.index(
      superAdminConnection,
      {
        body: {
          createdAtStart: oneHourAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallGuest.IRequest,
      },
    );
  typia.assert(resultWithStartFilter);
  // 4. Test with only end date filter
  const resultWithEndFilter =
    await api.functional.ecommerceMall.superAdmin.guests.index(
      superAdminConnection,
      {
        body: {
          createdAtEnd: oneHourLater.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallGuest.IRequest,
      },
    );
  typia.assert(resultWithEndFilter);
  // 5. Test lastActivityAt date range filters
  const resultWithActivityFilter =
    await api.functional.ecommerceMall.superAdmin.guests.index(
      superAdminConnection,
      {
        body: {
          lastActivityAtStart: oneHourAgo.toISOString(),
          lastActivityAtEnd: oneHourLater.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallGuest.IRequest,
      },
    );
  typia.assert(resultWithActivityFilter);
  // 6. Test edge case: future date range should return empty results
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const resultFuture =
    await api.functional.ecommerceMall.superAdmin.guests.index(
      superAdminConnection,
      {
        body: {
          createdAtStart: farFuture.toISOString(),
          createdAtEnd: new Date(
            farFuture.getTime() + 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallGuest.IRequest,
      },
    );
  typia.assert(resultFuture);
  TestValidator.equals(
    "empty results for future date",
    resultFuture.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records zero",
    resultFuture.pagination.records,
    0,
  );
  // 7. Test combined filters
  const resultCombined =
    await api.functional.ecommerceMall.superAdmin.guests.index(
      superAdminConnection,
      {
        body: {
          createdAtStart: oneHourAgo.toISOString(),
          createdAtEnd: oneHourLater.toISOString(),
          lastActivityAtStart: oneHourAgo.toISOString(),
          lastActivityAtEnd: oneHourLater.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallGuest.IRequest,
      },
    );
  typia.assert(resultCombined);
}
