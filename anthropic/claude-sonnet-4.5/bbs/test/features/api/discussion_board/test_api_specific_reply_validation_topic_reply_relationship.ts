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
 * Validates topic-reply relationship enforcement in reply retrieval.
 *
 * This test ensures that the GET
 * /discussionBoard/topics/{topicId}/replies/{replyId} endpoint properly
 * validates that a reply belongs to the specified topic, preventing
 * unauthorized access through URL manipulation.
 *
 * Workflow:
 *
 * 1. Administrator creates category
 * 2. Member creates Topic A and Topic B
 * 3. Member posts reply to Topic A
 * 4. Attempt to access Topic A's reply using Topic B's topicId (should fail)
 * 5. Verify error response
 * 6. Access reply with correct topicId (should succeed)
 * 7. Verify successful retrieval
 */
export async function test_api_specific_reply_validation_topic_reply_relationship(
  connection: api.IConnection,
) {
  // Step 1: Administrator authenticates and creates category
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
          description: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 5,
            wordMax: 10,
          }),
          parent_category_id: null,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >() satisfies number as number,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Member authenticates
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
      display_name: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<50>
      >(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Member creates Topic A
  const topicATitle = typia.random<
    string & tags.MinLength<10> & tags.MaxLength<200>
  >();
  const topicABody = typia.random<
    string & tags.MinLength<20> & tags.MaxLength<50000>
  >();

  const topicA = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: topicATitle,
        body: topicABody,
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topicA);

  // Step 4: Member creates Topic B
  const topicBTitle = typia.random<
    string & tags.MinLength<10> & tags.MaxLength<200>
  >();
  const topicBBody = typia.random<
    string & tags.MinLength<20> & tags.MaxLength<50000>
  >();

  const topicB = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: topicBTitle,
        body: topicBBody,
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topicB);

  // Step 5: Member posts a reply to Topic A
  const replyContent = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<10000>
  >();

  const replyToTopicA =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topicA.id,
        body: {
          discussion_board_topic_id: topicA.id,
          parent_reply_id: null,
          content: replyContent,
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(replyToTopicA);

  // Step 6: Attempt to retrieve Topic A's reply using Topic B's topicId (should fail)
  await TestValidator.error(
    "should fail when accessing reply with incorrect topicId",
    async () => {
      await api.functional.discussionBoard.topics.replies.at(connection, {
        topicId: topicB.id,
        replyId: replyToTopicA.id,
      });
    },
  );

  // Step 7: Execute correct GET request with matching topicId and replyId
  const retrievedReply = await api.functional.discussionBoard.topics.replies.at(
    connection,
    {
      topicId: topicA.id,
      replyId: replyToTopicA.id,
    },
  );
  typia.assert(retrievedReply);

  // Step 8: Verify successful retrieval with correct data
  TestValidator.equals(
    "retrieved reply ID matches",
    retrievedReply.id,
    replyToTopicA.id,
  );
  TestValidator.equals(
    "retrieved reply topic ID matches",
    retrievedReply.discussion_board_topic_id,
    topicA.id,
  );
  TestValidator.equals(
    "retrieved reply content matches",
    retrievedReply.content,
    replyContent,
  );
}
