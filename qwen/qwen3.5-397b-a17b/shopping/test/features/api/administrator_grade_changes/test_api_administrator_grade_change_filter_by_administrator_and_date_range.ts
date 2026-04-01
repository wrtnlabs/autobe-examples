import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGradeChange";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_grade_change_filter_by_administrator_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create a second super administrator to perform grade changes
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2Auth = await authorize_super_administrator_join(
    superAdmin2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin2Auth);
  // 3. Query grade changes with combined filters
  // Filter by the first super administrator's ID and a date range
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const filteredResult =
    await api.functional.shoppingMall.superAdministrator.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          shopping_mall_administrator_id: superAdminAuth.id,
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: oneDayLater.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(filteredResult);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    filteredResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 20",
    filteredResult.pagination.limit === 20,
  );
  TestValidator.predicate(
    "records count is non-negative",
    filteredResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    filteredResult.pagination.pages >= 0,
  );
  // 5. Validate all returned records match the filter criteria
  for (const record of filteredResult.data) {
    // Verify administrator ID matches filter
    TestValidator.equals(
      "administrator ID matches filter",
      record.administrator.id,
      superAdminAuth.id,
    );
    // Verify createdAt is within the date range
    const createdAt = new Date(record.createdAt);
    TestValidator.predicate(
      "createdAt is after from date",
      createdAt >= oneDayAgo,
    );
    TestValidator.predicate(
      "createdAt is before to date",
      createdAt <= oneDayLater,
    );
    // Verify required fields exist
    TestValidator.predicate("record has valid ID", record.id !== undefined);
    TestValidator.predicate(
      "record has administrator",
      record.administrator !== undefined,
    );
    TestValidator.predicate(
      "record has superAdministrator",
      record.superAdministrator !== undefined,
    );
    TestValidator.predicate(
      "record has previousGrade",
      record.previousGrade !== undefined,
    );
    TestValidator.predicate(
      "record has newGrade",
      record.newGrade !== undefined,
    );
    TestValidator.predicate(
      "record has createdAt",
      record.createdAt !== undefined,
    );
    // Verify email fields from JOINs are present
    TestValidator.predicate(
      "administrator has email",
      record.administrator.email !== undefined,
    );
    TestValidator.predicate(
      "superAdministrator has email",
      record.superAdministrator.email !== undefined,
    );
    // Verify grade values are valid
    TestValidator.predicate(
      "previousGrade is valid",
      record.previousGrade === "administrator" ||
        record.previousGrade === "super_administrator",
    );
    TestValidator.predicate(
      "newGrade is valid",
      record.newGrade === "administrator" ||
        record.newGrade === "super_administrator",
    );
  }
  // 6. Test with search keyword filter combined with other filters
  const searchResult =
    await api.functional.shoppingMall.superAdministrator.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          shopping_mall_administrator_id: superAdminAuth.id,
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: oneDayLater.toISOString(),
          search: superAdminAuth.email.substring(0, 5),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(searchResult);
  // 7. Validate search results also match all criteria
  for (const record of searchResult.data) {
    TestValidator.equals(
      "search result administrator ID matches",
      record.administrator.id,
      superAdminAuth.id,
    );
    // Verify email contains search keyword
    const emailMatch =
      record.administrator.email.includes(
        superAdminAuth.email.substring(0, 5),
      ) ||
      record.superAdministrator.email.includes(
        superAdminAuth.email.substring(0, 5),
      );
    TestValidator.predicate("email matches search keyword", emailMatch);
  }
  // 8. Test with no results scenario (date range in the past)
  const farPast = new Date("2000-01-01T00:00:00.000Z");
  const farPastEnd = new Date("2000-01-02T00:00:00.000Z");
  const emptyResult =
    await api.functional.shoppingMall.superAdministrator.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          shopping_mall_administrator_id: superAdminAuth.id,
          created_at_from: farPast.toISOString(),
          created_at_to: farPastEnd.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate empty result structure
  TestValidator.equals("empty result data array", emptyResult.data, []);
  TestValidator.predicate(
    "empty result has 0 records",
    emptyResult.pagination.records === 0,
  );
  TestValidator.predicate(
    "empty result has 0 pages",
    emptyResult.pagination.pages === 0,
  );
}
