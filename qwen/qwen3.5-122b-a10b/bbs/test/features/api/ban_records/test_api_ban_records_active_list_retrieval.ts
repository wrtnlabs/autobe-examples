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

/**
 * Test that an authenticated administrator can successfully retrieve a paginated list of currently active user ban records.
 * The test verifies:
 * (1) The endpoint returns HTTP 200 with a properly structured response containing pagination metadata and an array of ban record summaries
 * (2) Each ban record includes the ban ID, reason, banned_at timestamp, unbanned_at (null for active bans), and nested member and administrator information
 * (3) Results are sorted by banned_at in descending order (newest bans first)
 * (4) Pagination parameters (page, limit) are respected and reflected in the response metadata
 * (5) The response only includes records where unbanned_at IS NULL (active bans only)
 */
export async function test_api_ban_records_active_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@test.com",
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "regular",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve active ban records with pagination
  const page = 1;
  const limit = 10;
  const response =
    await api.functional.discussionBoard.admin.ban_records.active.index(
      adminConnection,
      {
        body: {
          page,
          limit,
          isActive: true,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, limit);
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate ban record structure and content
  for (const record of response.data) {
    // Verify unbanned_at is null for active bans
    TestValidator.equals(
      "active ban has null unbanned_at",
      record.unbanned_at,
      null,
    );
    // Verify required fields exist
    TestValidator.predicate("ban record has ID", record.id !== undefined);
    TestValidator.predicate("ban record has reason", record.reason.length > 0);
    TestValidator.predicate(
      "ban record has banned_at",
      record.banned_at !== undefined,
    );
    // Verify member information
    TestValidator.predicate(
      "member has ID",
      record.discussionBoardMember.id !== undefined,
    );
    TestValidator.predicate(
      "member has display_name",
      record.discussionBoardMember.display_name.length > 0,
    );
    TestValidator.predicate(
      "member has ban_status",
      record.discussionBoardMember.ban_status !== undefined,
    );
    // Verify administrator information
    TestValidator.predicate(
      "admin has ID",
      record.discussionBoardAdmin.id !== undefined,
    );
    TestValidator.predicate(
      "admin has display_name",
      record.discussionBoardAdmin.display_name.length > 0,
    );
    TestValidator.predicate(
      "admin has grade",
      record.discussionBoardAdmin.grade !== undefined,
    );
  }
  // 5. Validate sorting (newest bans first - descending order by banned_at)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].banned_at).getTime();
      const next = new Date(response.data[i + 1].banned_at).getTime();
      TestValidator.predicate(
        `ban records sorted by banned_at DESC at index ${i}`,
        current >= next,
      );
    }
  }
}