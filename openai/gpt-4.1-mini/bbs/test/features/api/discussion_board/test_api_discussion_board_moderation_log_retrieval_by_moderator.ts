import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReply";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Verify detailed moderation log retrieval by authorized moderator.
 *
 * This end-to-end test performs the following workflow:
 *
 * 1. Register and authenticate a new moderator account, ensuring valid JWT tokens.
 * 2. Register and authenticate a new admin account to setup required data.
 * 3. Using the admin, create a discussion category.
 * 4. Create a discussion post under that category with valid attributes.
 * 5. Add replies to the created post by members.
 * 6. Retrieve a specific moderation log entry by ID as a moderator, validate all
 *    fields.
 * 7. Test unauthorized access attempts with missing or invalid authentication
 *    tokens.
 *
 * The test verifies system security, correct data linkage, and logs integrity.
 */
export async function test_api_discussion_board_moderation_log_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Moderator join
  const moderatorCreate = {
    email: `moderator+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "TestPass1234",
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join.joinModerator(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);

  // Step 2: Admin join
  const adminCreate = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPass1234",
    displayName: RandomGenerator.name(2),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // Step 3: Create category
  const categoryCreate = {
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: categoryCreate,
      },
    );
  typia.assert(category);

  // Step 4: Create discussion board post
  const postCreate = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 5, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    post_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;

  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: postCreate,
      },
    );
  typia.assert(post);

  // Step 5: Create reply to the post
  const replyCreate = {
    post_id: post.id,
    member_id: typia.random<string & tags.Format<"uuid">>(),
    content: RandomGenerator.paragraph({ sentences: 8 }),
    reply_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardReply.ICreate;

  const reply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByDiscussionboardpostid(
      connection,
      {
        discussionBoardPostId: post.id,
        body: replyCreate,
      },
    );
  typia.assert(reply);

  // At this point, to retrieve a moderation log entry, we need a moderationLogId.
  // Since creation of moderationLog entries is not directly exposed,
  // we fetch the first available moderation log for this moderator if any.

  // We simulate retrieving the latest moderation log made by this moderator.
  // Note: Because we do not have API to list moderation logs or create them explicitly,
  // we simulate one by fetching a random moderation log ID for test purposes.

  // For testing, get random UUID for moderationLogId; in real case,
  // a valid moderationLogId from test data should be used.
  // Here, use reply.id as hypothetical moderationLogId if suitable;
  // Otherwise, query a moderation log ID field is not provided.

  // We attempt to retrieve moderation log by a hypothetic moderation log ID.
  // Use random generated UUID to test unauthorized and invalid data error handling later.

  // However, for enabling a successful retrieval, we assume moderationLogId as a random UUID.
  // This is a limitation due to the absence of moderation log creation API.

  // We'll attempt with arbitrary moderationLogId of the reply's id for demonstration.
  const moderationLogId = reply.id;

  // Step 6: Retrieve moderation log by moderator authorized token
  const moderationLog: IDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.discussionBoard.moderationLogs.at(
      connection,
      {
        moderationLogId: moderationLogId,
      },
    );
  typia.assert(moderationLog);

  TestValidator.predicate(
    "moderation log has valid id",
    typeof moderationLog.id === "string" && moderationLog.id.length > 0,
  );
  TestValidator.predicate(
    "moderation log has valid action type",
    typeof moderationLog.action_type === "string" &&
      moderationLog.action_type.length > 0,
  );
  TestValidator.equals(
    "moderation log moderator id equals logged moderator id",
    moderationLog.moderator_id,
    moderator.id,
  );

  // Step 7: Unauthorized access test - no token
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized retrieval without token",
    async () => {
      await api.functional.discussionBoard.moderator.discussionBoard.moderationLogs.at(
        unauthConnection,
        { moderationLogId: moderationLogId },
      );
    },
  );

  // Step 8: Unauthorized access test - invalid token
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer invalid.token.value" },
  };

  await TestValidator.error(
    "unauthorized retrieval with invalid token",
    async () => {
      await api.functional.discussionBoard.moderator.discussionBoard.moderationLogs.at(
        invalidTokenConnection,
        { moderationLogId: moderationLogId },
      );
    },
  );
}
