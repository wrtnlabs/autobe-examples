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
 * Test guest user public access to specific discussion board replies.
 *
 * Validates that unauthenticated users can retrieve individual replies via
 * permalinks or direct links, ensuring public read-only access supports content
 * discovery and encourages platform registration.
 *
 * Workflow:
 *
 * 1. Administrator creates category for topic organization
 * 2. Member registers, creates topic, and posts a reply
 * 3. Guest user retrieves specific reply without authentication
 * 4. Validates reply content, author info, and timestamps are accessible
 * 5. Confirms threading context and engagement metrics are visible
 */
export async function test_api_specific_reply_public_guest_access(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
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
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
          slug: typia.random<string & tags.Pattern<"^[a-z0-9-]+$">>(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Member creates topic and reply
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

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<200>
        >(),
        body: typia.random<
          string & tags.MinLength<20> & tags.MaxLength<50000>
        >(),
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
          content: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<10000>
          >(),
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);

  // Step 3: Create unauthenticated guest connection
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // Step 4: Guest retrieves specific reply without authentication
  const guestReply = await api.functional.discussionBoard.topics.replies.at(
    guestConnection,
    {
      topicId: topic.id,
      replyId: reply.id,
    },
  );
  typia.assert(guestReply);

  // Step 5: Validate reply accessibility and completeness
  TestValidator.equals("reply IDs match", guestReply.id, reply.id);
  TestValidator.equals(
    "reply content accessible",
    guestReply.content,
    reply.content,
  );
  TestValidator.equals(
    "reply topic ID matches",
    guestReply.discussion_board_topic_id,
    topic.id,
  );
  TestValidator.equals(
    "reply member ID matches",
    guestReply.discussion_board_member_id,
    member.id,
  );

  // Validate threading context
  TestValidator.equals(
    "parent reply ID accessible",
    guestReply.parent_reply_id,
    reply.parent_reply_id,
  );
  TestValidator.equals(
    "depth level accessible",
    guestReply.depth_level,
    reply.depth_level,
  );

  // Validate timestamps are accessible
  TestValidator.equals(
    "created timestamp accessible",
    guestReply.created_at,
    reply.created_at,
  );
  TestValidator.equals(
    "updated timestamp accessible",
    guestReply.updated_at,
    reply.updated_at,
  );
}
