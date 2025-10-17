import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validates reply creation rate limiting enforcement to prevent spam.
 *
 * Tests that the discussion board properly enforces rate limiting rules on
 * reply creation, specifically validating the 30 replies per hour limit for
 * members. Rate limiting is tracked per user to allow legitimate concurrent
 * discussions while preventing individual spam abuse.
 *
 * Workflow steps:
 *
 * 1. Create a member account for rate limiting testing
 * 2. Create an administrator account for category management
 * 3. Create a category for organizing the test topic
 * 4. Create a discussion topic to receive reply attempts
 * 5. Post 30 replies successfully (within hourly limit)
 * 6. Verify 31st reply is rejected with rate limit error
 */
export async function test_api_reply_creation_rate_limiting_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create member account for rate limiting testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: adminEmail,
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create category for topic organization (as admin)
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to member authentication context
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberAuth);

  // Step 4: Create discussion topic for reply testing
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 5: Post 30 replies successfully (within hourly limit)
  const replies = await ArrayUtil.asyncRepeat(30, async (index) => {
    const reply =
      await api.functional.discussionBoard.member.topics.replies.create(
        connection,
        {
          topicId: topic.id,
          body: {
            discussion_board_topic_id: topic.id,
            parent_reply_id: null,
            content: `${RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 })} - Reply ${index + 1}`,
          } satisfies IDiscussionBoardReply.ICreate,
        },
      );
    typia.assert(reply);
    return reply;
  });

  TestValidator.equals("created 30 replies successfully", replies.length, 30);

  // Step 6: Verify 31st reply is rejected with rate limit error
  await TestValidator.error(
    "31st reply should be rejected by rate limit",
    async () => {
      await api.functional.discussionBoard.member.topics.replies.create(
        connection,
        {
          topicId: topic.id,
          body: {
            discussion_board_topic_id: topic.id,
            parent_reply_id: null,
            content: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies IDiscussionBoardReply.ICreate,
        },
      );
    },
  );
}
