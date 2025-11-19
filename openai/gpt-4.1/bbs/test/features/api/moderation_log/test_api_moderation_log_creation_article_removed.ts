import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

/**
 * Test creation of a moderation log entry for removing an article.
 *
 * 1. Register a new board admin by calling admin join; check that a valid admin is
 *    created and authenticated (token injected).
 * 2. Prepare a moderation log creation request (target_type: "article", target_id:
 *    random UUID, action: "remove", reason: unique content, outcome: "deleted",
 *    created_at: now).
 * 3. Submit POST /discussionBoard/admin/moderationLogs using the authenticated
 *    admin context; validate the returned log entry is created as expected
 *    (matches input and contains audit context).
 */
export async function test_api_moderation_log_creation_article_removed(
  connection: api.IConnection,
) {
  // 1. Register new board admin
  const adminJoin: IDiscussionBoardAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: "https://admin.portal.example.com/register",
    referrer: "https://admin.portal.example.com/",
    // no IP
  };
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin });
  typia.assert(admin);

  // 2. Formulate moderation log creation (simulate removal of an article by admin)
  const targetArticleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const logCreate = {
    target_type: "article",
    target_id: targetArticleId,
    action: "remove",
    reason: RandomGenerator.paragraph({ sentences: 2, wordMin: 6 }),
    outcome: "deleted",
    created_at: now,
  } satisfies IDiscussionBoardModerationLog.ICreate;

  // 3. Create moderation log entry via API
  const moderationLog: IDiscussionBoardModerationLog =
    await api.functional.discussionBoard.admin.moderationLogs.create(
      connection,
      { body: logCreate },
    );
  typia.assert(moderationLog);

  // 4. Assertions on log correctness
  TestValidator.predicate(
    "moderation log id is valid uuid",
    typeof moderationLog.id === "string" &&
      moderationLog.id.length > 0 &&
      moderationLog.id !== targetArticleId,
  );
  TestValidator.equals(
    "target_type matches input",
    moderationLog.target_type,
    logCreate.target_type,
  );
  TestValidator.equals(
    "target_id matches input",
    moderationLog.target_id,
    logCreate.target_id,
  );
  TestValidator.equals(
    "action matches input",
    moderationLog.action,
    logCreate.action,
  );
  TestValidator.equals(
    "reason matches input",
    moderationLog.reason,
    logCreate.reason,
  );
  TestValidator.equals(
    "outcome matches input",
    moderationLog.outcome,
    logCreate.outcome,
  );
  TestValidator.equals(
    "created_at matches input",
    moderationLog.created_at,
    logCreate.created_at,
  );
  TestValidator.equals(
    "admin_id matches admin",
    moderationLog.admin_id,
    admin.id,
  );
}
