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
 * Test administrator retrieves paginated list of ban records with default sorting (newest bans first).
 * Validates pagination metadata and ban record summaries including banned user info, admin details, ban reason, and timestamps.
 */
export async function test_api_ban_records_retrieve_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve ban records with default pagination
  const defaultPage =
    await api.functional.discussionBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "banned_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(defaultPage);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", defaultPage.pagination.current, 1);
  TestValidator.equals("limit is 20", defaultPage.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    defaultPage.pagination.pages >= 0,
  );
  // 4. Validate ban record structure if records exist
  if (defaultPage.data.length > 0) {
    const firstRecord = defaultPage.data[0];
    // Validate ban record summary fields exist and have expected types
    TestValidator.predicate("has ban reason", firstRecord.reason.length > 0);
    // Validate unbanned_at is null or set (business logic: active vs historical bans)
    TestValidator.predicate(
      "unbanned_at is null or timestamp",
      firstRecord.unbanned_at === null || firstRecord.unbanned_at.length > 0,
    );
    // Validate nested member summary exists
    TestValidator.predicate(
      "member has display name",
      firstRecord.discussionBoardMember.displayName.length > 0,
    );
    TestValidator.predicate(
      "member article count is non-negative",
      firstRecord.discussionBoardMember.articleCount >= 0,
    );
    TestValidator.predicate(
      "member comment count is non-negative",
      firstRecord.discussionBoardMember.commentCount >= 0,
    );
    // Validate nested admin summary exists
    TestValidator.predicate(
      "admin has display name",
      firstRecord.discussionBoardAdmin.display_name.length > 0,
    );
    // Validate timestamps exist
    TestValidator.predicate(
      "has created_at",
      firstRecord.created_at.length > 0,
    );
    TestValidator.predicate(
      "has updated_at",
      firstRecord.updated_at.length > 0,
    );
  }
  // 5. Test custom pagination parameters
  const customPage =
    await api.functional.discussionBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(customPage);
  TestValidator.equals("custom page is 2", customPage.pagination.current, 2);
  TestValidator.equals("custom limit is 10", customPage.pagination.limit, 10);
  TestValidator.predicate(
    "custom pages is non-negative",
    customPage.pagination.pages >= 0,
  );
}
