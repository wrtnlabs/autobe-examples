import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_password_reset_filtered_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via join (returns authorized tokens)
  const adminConnection: api.IConnection = { host: connection.host };
  const joinedAdmin = await authorize_admin_join(adminConnection, {});
  typia.assert(joinedAdmin);
  // 2. Test created_at date range filtering
  const createdFrom = new Date();
  createdFrom.setDate(createdFrom.getDate() - 1);
  const createdTo = new Date();
  createdTo.setDate(createdTo.getDate() + 1);
  const createdAtRange =
    await api.functional.ecommerceMall.admin.admin.password_resets.index(
      adminConnection,
      {
        body: {
          created_at_from: createdFrom.toISOString(),
          created_at_to: createdTo.toISOString(),
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(createdAtRange);
  TestValidator.equals(
    "has pagination wrapper",
    "pagination" in createdAtRange,
    true,
  );
  TestValidator.equals("has data array", "data" in createdAtRange, true);
  TestValidator.predicate(
    "pagination has inner pagination object",
    typeof createdAtRange.pagination.pagination === "object",
  );
  // 3. Test expires_at date range filtering
  const expiresFrom = new Date();
  expiresFrom.setDate(expiresFrom.getDate() + 1);
  const expiresTo = new Date();
  expiresTo.setDate(expiresTo.getDate() + 7);
  const expiresAtRange =
    await api.functional.ecommerceMall.admin.admin.password_resets.index(
      adminConnection,
      {
        body: {
          expires_at_from: expiresFrom.toISOString(),
          expires_at_to: expiresTo.toISOString(),
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(expiresAtRange);
  TestValidator.predicate(
    "expires_at range has valid inner pagination",
    typeof expiresAtRange.pagination.pagination === "object",
  );
  // 4. Edge case: fromDate equals toDate (single day filter)
  const singleDay = new Date();
  singleDay.setHours(0, 0, 0, 0);
  const singleDayFrom = singleDay.toISOString();
  const singleDayTo = new Date(
    singleDay.getTime() + 24 * 60 * 60 * 1000 - 1,
  ).toISOString();
  const singleDayResult =
    await api.functional.ecommerceMall.admin.admin.password_resets.index(
      adminConnection,
      {
        body: {
          created_at_from: singleDayFrom,
          created_at_to: singleDayTo,
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(singleDayResult);
  TestValidator.predicate(
    "single day filter returns valid result",
    typeof singleDayResult.pagination.pagination === "object",
  );
  // 5. Edge case: fromDate in the future returns empty results
  const futureFrom = new Date();
  futureFrom.setFullYear(futureFrom.getFullYear() + 10);
  const futureTo = new Date();
  futureTo.setFullYear(futureTo.getFullYear() + 11);
  const futureResult =
    await api.functional.ecommerceMall.admin.admin.password_resets.index(
      adminConnection,
      {
        body: {
          created_at_from: futureFrom.toISOString(),
          created_at_to: futureTo.toISOString(),
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(futureResult);
  TestValidator.equals(
    "future date range returns empty",
    futureResult.data.length,
    0,
  );
  // 6. Combined date range filters
  const combinedFrom = new Date();
  combinedFrom.setDate(combinedFrom.getDate() - 7);
  const combinedTo = new Date();
  combinedTo.setDate(combinedTo.getDate() + 7);
  const combinedExpiresFrom = new Date();
  combinedExpiresFrom.setDate(combinedExpiresFrom.getDate() + 1);
  const combinedExpiresTo = new Date();
  combinedExpiresTo.setDate(combinedExpiresTo.getDate() + 30);
  const combinedResult =
    await api.functional.ecommerceMall.admin.admin.password_resets.index(
      adminConnection,
      {
        body: {
          created_at_from: combinedFrom.toISOString(),
          created_at_to: combinedTo.toISOString(),
          expires_at_from: combinedExpiresFrom.toISOString(),
          expires_at_to: combinedExpiresTo.toISOString(),
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filters return valid pagination",
    typeof combinedResult.pagination.pagination === "object",
  );
  // 7. Pagination with date filters
  const paginatedResult =
    await api.functional.ecommerceMall.admin.admin.password_resets.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_from: new Date(2020, 0, 1).toISOString(),
          created_at_to: new Date(2099, 11, 31).toISOString(),
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "paginated result has valid structure",
    typeof paginatedResult.pagination.pagination === "object",
  );
  TestValidator.predicate(
    "data array exists in paginated result",
    Array.isArray(paginatedResult.data),
  );
}
