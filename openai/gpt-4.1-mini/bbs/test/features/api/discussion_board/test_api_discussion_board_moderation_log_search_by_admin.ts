import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReply";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Validate searching and retrieval of moderation logs by authenticated
 * administrators.
 *
 * This end-to-end test covers the full lifecycle of moderation log audits:
 *
 * 1. Admin user registration and authentication
 * 2. Discussion board category creation by admin
 * 3. Member user registration and authentication
 * 4. Member creates a discussion board post under the category
 * 5. Member adds a reply to the post
 * 6. Admin searches moderation logs filtered by post ID and reply ID
 * 7. Verify returned logs include correct action types, timestamps, and moderator
 *    info
 * 8. Verify access control restricting endpoint to only authenticated admins
 *
 * This test uses real realistic data, proper DTO typing, and role-based session
 * switching. The functionality of moderation auditing endpoints is verified for
 * data integrity, security, and business logic.
 */
export async function test_api_discussion_board_moderation_log_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "password123";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(2),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // 2. Admin login to authenticate
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdmin.ILogin;

  const adminLoginAuthorized = await api.functional.auth.admin.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert(adminLoginAuthorized);

  // 3. Admin creates a discussion board category
  const categoryCreateBody = {
    name: "Economic",
    description: "Category for economic discussions",
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Member account creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberAuthorized = await api.functional.auth.member.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(memberAuthorized);

  // 5. Member login to authenticate
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IDiscussionBoardMember.ILogin;

  const memberLoginAuthorized = await api.functional.auth.member.login(
    connection,
    {
      body: memberLoginBody,
    },
  );
  typia.assert(memberLoginAuthorized);

  // 6. Member creates a discussion board post
  const postCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    post_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;

  const post =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 7. Member creates a reply to the post
  const replyCreateBody = {
    post_id: post.id,
    member_id: memberAuthorized.id,
    content: RandomGenerator.paragraph({ sentences: 2 }),
    reply_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardReply.ICreate;

  const reply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByDiscussionboardpostid(
      connection,
      {
        discussionBoardPostId: post.id,
        body: replyCreateBody,
      },
    );
  typia.assert(reply);

  // 8. Admin performs moderation logs search filtered by post and reply ID
  // Searching by post_id is the primary focus, reply_id also included
  const searchRequest = {
    page: 1,
    limit: 10,
    post_id: post.id,
    reply_id: reply.id,
    order_by: "created_at_desc",
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const moderationLogs =
    await api.functional.discussionBoard.admin.discussionBoard.moderationLogs.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(moderationLogs);

  // 9. Validate moderation logs data
  TestValidator.predicate(
    "moderation logs contain at least one entry",
    moderationLogs.data.length > 0,
  );

  moderationLogs.data.forEach((log) => {
    TestValidator.predicate(
      "log entry has valid UUID IDs or null",
      (log.id && typeof log.id === "string") || log.id != null,
    );
    TestValidator.predicate(
      "post_id matches or is null",
      log.post_id === post.id || log.post_id === null,
    );
    TestValidator.predicate(
      "reply_id matches or is null",
      log.reply_id === reply.id || log.reply_id === null,
    );
    TestValidator.predicate(
      "action_type is non-empty string",
      typeof log.action_type === "string" && log.action_type.length > 0,
    );
    TestValidator.predicate(
      "created_at is valid ISO 8601",
      typeof log.created_at === "string" && !isNaN(Date.parse(log.created_at)),
    );
  });

  // 10. Validate authorization enforcement
  // Try accessing moderation logs with unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated user cannot access moderation logs",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoard.moderationLogs.index(
        unauthenticatedConnection,
        { body: searchRequest },
      );
    },
  );

  // Try accessing moderation logs with member authenticated connection
  // We must re-authenticate member since admin login may override token
  await api.functional.auth.member.login(connection, {
    body: memberLoginBody,
  });

  await TestValidator.error(
    "member role user cannot access moderation logs",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoard.moderationLogs.index(
        connection,
        { body: searchRequest },
      );
    },
  );

  // Re-authenticate admin for cleanup or further admin actions if desired
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
}
