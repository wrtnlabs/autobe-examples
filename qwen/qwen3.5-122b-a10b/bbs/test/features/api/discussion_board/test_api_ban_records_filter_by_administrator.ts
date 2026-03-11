import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_ban_records_filter_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create two administrator accounts for testing
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "regular",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "super",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // Test 1: Filter ban records by admin1's ID
  const filteredByAdmin1 =
    await api.functional.discussionBoard.admin.ban_records.index(
      admin1Connection,
      {
        body: {
          adminId: admin1.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(filteredByAdmin1);
  // Verify all returned records belong to admin1
  TestValidator.predicate(
    "all records filtered by admin1 belong to admin1",
    filteredByAdmin1.data.every(
      (record) => record.discussionBoardAdmin.id === admin1.id,
    ),
  );
  // Verify admin information is correctly populated
  if (filteredByAdmin1.data.length > 0) {
    TestValidator.equals(
      "admin display_name matches",
      filteredByAdmin1.data[0].discussionBoardAdmin.display_name,
      admin1.display_name,
    );
    TestValidator.equals(
      "admin grade matches",
      filteredByAdmin1.data[0].discussionBoardAdmin.grade,
      admin1.grade,
    );
  }
  // Test 2: Filter by admin2's ID
  const filteredByAdmin2 =
    await api.functional.discussionBoard.admin.ban_records.index(
      admin2Connection,
      {
        body: {
          adminId: admin2.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(filteredByAdmin2);
  // Verify all returned records belong to admin2
  TestValidator.predicate(
    "all records filtered by admin2 belong to admin2",
    filteredByAdmin2.data.every(
      (record) => record.discussionBoardAdmin.id === admin2.id,
    ),
  );
  // Test 3: Combined filter with adminId and isActive
  const combinedFilter =
    await api.functional.discussionBoard.admin.ban_records.index(
      admin1Connection,
      {
        body: {
          adminId: admin1.id,
          isActive: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination records count is non-negative",
    combinedFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    combinedFilter.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    combinedFilter.pagination.limit > 0,
  );
  // Verify combined filter results match adminId filter
  if (combinedFilter.data.length > 0) {
    TestValidator.predicate(
      "all combined filter records belong to admin1",
      combinedFilter.data.every(
        (record) => record.discussionBoardAdmin.id === admin1.id,
      ),
    );
  }
}
