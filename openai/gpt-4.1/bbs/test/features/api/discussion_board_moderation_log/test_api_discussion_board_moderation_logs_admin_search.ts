import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Validate admin search, filter, and pagination for moderation logs with
 * authentication and access-control checks.
 *
 * This test confirms that:
 *
 * 1. Admin registration and session acquisition works correctly.
 * 2. Authenticated admin may query moderation logs using various filters and
 *    receives valid paginated, schema-compliant data.
 * 3. Only authenticated admins can access moderation logs;
 *    unauthenticated/unauthorized access is rejected.
 *
 * Steps:
 *
 * 1. Register a new board admin account and authenticate.
 * 2. Perform a filtered, paginated moderation log search (using Random data for
 *    diversity).
 * 3. Assert data structure and filter/pagination effects.
 * 4. Repeat the search without authentication and confirm authorization fails.
 */
export async function test_api_discussion_board_moderation_logs_admin_search(
  connection: api.IConnection,
) {
  // 1. Register admin account and authenticate
  const adminJoin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.Format<"password">
        >(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(adminJoin);

  // 2. Authenticated search with filters/pagination
  const searchInput = {
    action: RandomGenerator.pick(["remove", "edit", "ban", undefined]),
    outcome: RandomGenerator.pick([
      "deleted",
      "edited",
      "banned",
      "restored",
      undefined,
    ]),
    target_type: RandomGenerator.pick([
      "article",
      "comment",
      "attachment",
      undefined,
    ]),
    search: RandomGenerator.paragraph({ sentences: 2 }),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IDiscussionBoardModerationLog.IRequest;
  const pageResult: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.admin.moderationLogs.index(
      connection,
      { body: searchInput },
    );
  typia.assert(pageResult);
  // Data shape checks
  TestValidator.equals(
    "pagination.limit matches requested",
    pageResult.pagination.limit,
    searchInput.limit,
  );
  TestValidator.equals(
    "pagination.page matches requested",
    pageResult.pagination.current,
    searchInput.page,
  );

  // If results exist, confirm filter/search constraints and structure
  if (pageResult.data.length > 0) {
    for (const log of pageResult.data) {
      typia.assert(log);
      if (searchInput.action !== undefined)
        TestValidator.equals(
          "log action matches",
          log.action,
          searchInput.action,
        );
      if (searchInput.outcome !== undefined)
        TestValidator.equals(
          "log outcome matches",
          log.outcome,
          searchInput.outcome,
        );
      if (searchInput.target_type !== undefined)
        TestValidator.equals(
          "log target_type matches",
          log.target_type,
          searchInput.target_type,
        );
      if (searchInput.search !== undefined && !!searchInput.search) {
        TestValidator.predicate(
          "log reason or action contains search term",
          log.reason.includes(searchInput.search) ||
            log.action.includes(searchInput.search),
        );
      }
    }
  }

  // 3. Access-control: unauthenticated attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot search moderation logs",
    async () => {
      await api.functional.discussionBoard.admin.moderationLogs.index(
        unauthConn,
        { body: searchInput },
      );
    },
  );
}
