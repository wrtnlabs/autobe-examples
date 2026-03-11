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

export async function test_api_ban_records_active_filter_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "regular",
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test filtering by specific member ID
  // Note: This test validates the filtering logic with the API endpoint.
  // In a real scenario with actual data, this would filter existing ban records.
  const testMemberId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  const filteredResult =
    await api.functional.discussionBoard.admin.ban_records.active.index(
      adminConnection,
      {
        body: {
          memberId: testMemberId,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(filteredResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    filteredResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", filteredResult.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    filteredResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    filteredResult.pagination.pages >= 0,
  );
  // All returned records should match the filtered memberId
  for (const record of filteredResult.data) {
    typia.assert(record);
    TestValidator.equals(
      "member ID matches filter",
      record.discussionBoardMember.id,
      testMemberId,
    );
  }
  // 3. Test with non-existent member ID returns empty results
  const nonExistentMemberId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  const emptyResult =
    await api.functional.discussionBoard.admin.ban_records.active.index(
      adminConnection,
      {
        body: {
          memberId: nonExistentMemberId,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate empty result structure
  TestValidator.equals("empty data array", emptyResult.data.length, 0);
  TestValidator.equals(
    "pagination records zero",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages zero",
    emptyResult.pagination.pages,
    0,
  );
  // 4. Test sorting by banned_at DESC (default behavior)
  const sortedResult =
    await api.functional.discussionBoard.admin.ban_records.active.index(
      adminConnection,
      {
        body: {
          memberId: testMemberId,
          sort: {
            field: "banned_at",
            direction: "desc",
          },
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(sortedResult);
  // If multiple records exist, verify they're sorted by banned_at DESC
  if (sortedResult.data.length > 1) {
    for (let i = 0; i < sortedResult.data.length - 1; i++) {
      const current = new Date(sortedResult.data[i].banned_at).getTime();
      const next = new Date(sortedResult.data[i + 1].banned_at).getTime();
      TestValidator.predicate(
        `record ${i} banned_at >= record ${i + 1} banned_at`,
        current >= next,
      );
    }
  }
}
