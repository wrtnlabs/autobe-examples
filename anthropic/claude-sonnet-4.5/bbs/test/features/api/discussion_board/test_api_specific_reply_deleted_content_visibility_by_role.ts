import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test deleted reply visibility enforcement based on user roles.
 *
 * Validates that soft-deleted replies (marked with deleted_at timestamp) are:
 *
 * - Hidden from guest users (unauthenticated)
 * - Hidden from regular members
 * - Accessible to moderators for audit and review
 * - Accessible to administrators for audit purposes
 *
 * Workflow:
 *
 * 1. Administrator creates category for topic organization
 * 2. Member creates topic and posts a reply
 * 3. Member soft-deletes the reply
 * 4. Guest attempts retrieval (should fail)
 * 5. Different regular member attempts retrieval (should fail)
 * 6. Moderator retrieves deleted reply (should succeed)
 * 7. Administrator retrieves deleted reply (should succeed)
 */
export async function test_api_specific_reply_deleted_content_visibility_by_role(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates account and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: First member creates account, topic, and reply
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);

  // Step 3: Member soft-deletes the reply
  await api.functional.discussionBoard.member.topics.replies.erase(connection, {
    topicId: topic.id,
    replyId: reply.id,
  });

  // Step 4: Guest user attempts to retrieve deleted reply (should fail)
  const guestConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("guest cannot access deleted reply", async () => {
    await api.functional.discussionBoard.topics.replies.at(guestConnection, {
      topicId: topic.id,
      replyId: reply.id,
    });
  });

  // Step 5: Create different regular member and attempt to retrieve deleted reply (should fail)
  const otherMemberEmail = typia.random<string & tags.Format<"email">>();
  const otherMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: otherMemberEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(otherMember);

  await TestValidator.error(
    "regular member cannot access deleted reply",
    async () => {
      await api.functional.discussionBoard.topics.replies.at(connection, {
        topicId: topic.id,
        replyId: reply.id,
      });
    },
  );

  // Step 6: Moderator retrieves deleted reply (should succeed)
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: admin.id,
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  const moderatorReply = await api.functional.discussionBoard.topics.replies.at(
    connection,
    {
      topicId: topic.id,
      replyId: reply.id,
    },
  );
  typia.assert(moderatorReply);
  TestValidator.equals(
    "moderator can access deleted reply",
    moderatorReply.id,
    reply.id,
  );

  // Step 7: Administrator retrieves deleted reply (should succeed)
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  const adminReply = await api.functional.discussionBoard.topics.replies.at(
    connection,
    {
      topicId: topic.id,
      replyId: reply.id,
    },
  );
  typia.assert(adminReply);
  TestValidator.equals(
    "administrator can access deleted reply",
    adminReply.id,
    reply.id,
  );
}
