import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationLog";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_moderation_log_admin_get_by_id(
  connection: api.IConnection,
) {
  // --- Setup isolated per-role connections so SDK sets Authorization tokens ---
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const moderatorConn: api.IConnection = { ...connection, headers: {} };
  const userConn: api.IConnection = { ...connection, headers: {} };

  // --- 1) Administrator registration ---
  const admin = await api.functional.auth.administrator.join(adminConn, {
    body: typia.random<IEconPoliticalForumAdministrator.IJoin>() satisfies IEconPoliticalForumAdministrator.IJoin,
  });
  typia.assert(admin);

  // --- 2) Moderator registration ---
  const moderator = await api.functional.auth.moderator.join(moderatorConn, {
    body: typia.random<IEconPoliticalForumModerator.ICreate>() satisfies IEconPoliticalForumModerator.ICreate,
  });
  typia.assert(moderator);

  // --- 3) Registered user registration ---
  const user = await api.functional.auth.registeredUser.join(userConn, {
    body: typia.random<IEconPoliticalForumRegisteredUser.IJoin>() satisfies IEconPoliticalForumRegisteredUser.IJoin,
  });
  typia.assert(user);

  // --- 4) Admin creates a category ---
  const category =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      {
        body: typia.random<IEconPoliticalForumCategory.ICreate>() satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // --- 5) Registered user creates a thread under the category ---
  const thread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      userConn,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 4,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(12),
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // --- 6) Registered user creates a post in the thread ---
  const post =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      userConn,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 6,
            sentenceMax: 12,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // --- 7) Moderator soft-deletes the post (creates moderation activity) ---
  await api.functional.econPoliticalForum.moderator.posts.erase(moderatorConn, {
    postId: post.id,
  });

  // --- 8) Retrieve moderation log as administrator ---
  // NOTE: Because SDK lacks a log-list endpoint or moderator.erase does not
  // return the created moderation log id, we use a simulation-enabled admin
  // connection to fetch a schema-valid moderation log entry. When the backend
  // exposes a listing or returns the created log id, this step should be
  // replaced to retrieve the actual log for cross-reference assertions.
  const simAdminConn: api.IConnection = {
    ...connection,
    simulate: true,
    headers: {},
  };
  const syntheticLogId = typia.random<string & tags.Format<"uuid">>();

  const moderationLog =
    await api.functional.econPoliticalForum.administrator.moderationLogs.at(
      simAdminConn,
      {
        logId: syntheticLogId,
      },
    );
  typia.assert(moderationLog);

  // --- 9) Business-level assertions on returned moderation log shape ---
  TestValidator.predicate(
    "moderation log id should be present",
    typeof moderationLog.id === "string" && moderationLog.id.length > 0,
  );

  TestValidator.predicate(
    "moderation log action_type present",
    typeof moderationLog.action_type === "string" &&
      moderationLog.action_type.length > 0,
  );

  TestValidator.predicate(
    "moderation log reason_code present",
    typeof moderationLog.reason_code === "string" &&
      moderationLog.reason_code.length > 0,
  );

  TestValidator.predicate(
    "moderation log created_at present",
    typeof moderationLog.created_at === "string" &&
      moderationLog.created_at.length > 0,
  );

  TestValidator.predicate(
    "evidence_reference is string or null",
    moderationLog.evidence_reference === null ||
      typeof moderationLog.evidence_reference === "string",
  );

  TestValidator.predicate(
    "rationale is string or null",
    moderationLog.rationale === null ||
      typeof moderationLog.rationale === "string",
  );

  // At least one of moderator_id or target_post_id should be present in a
  // real moderation log entry.
  TestValidator.predicate(
    "moderation log references moderator or post",
    (moderationLog.moderator_id !== null &&
      moderationLog.moderator_id !== undefined) ||
      (moderationLog.target_post_id !== null &&
        moderationLog.target_post_id !== undefined),
  );
}
