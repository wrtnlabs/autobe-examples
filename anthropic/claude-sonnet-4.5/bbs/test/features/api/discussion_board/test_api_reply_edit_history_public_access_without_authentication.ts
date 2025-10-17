import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEditHistory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardEditHistory";

/**
 * Test that reply edit history can be retrieved without authentication for
 * public discussions.
 *
 * This test validates that edit transparency is maintained for all users
 * including guests by allowing unauthenticated access to reply edit history. It
 * creates a complete discussion workflow, performs multiple edits to generate
 * edit history, then retrieves the history without authentication to verify
 * public access.
 *
 * Steps:
 *
 * 1. Administrator creates a category for organizing topics
 * 2. Member joins to create discussion content
 * 3. Member creates a discussion topic in the category
 * 4. Member posts a reply to the topic
 * 5. Member updates the reply multiple times to create edit history
 * 6. Retrieve edit history without authentication to verify public access
 * 7. Validate edit history structure and content
 * 8. Verify pagination functionality
 * 9. Confirm chronological ordering of edit records
 */
export async function test_api_reply_edit_history_public_access_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Administrator registration and authentication
  const adminData = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Administrator creates a category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    parent_category_id: null,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Member registration and authentication
  const memberData = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Member creates a discussion topic
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topicData,
    },
  );
  typia.assert(topic);

  // Step 5: Member posts a reply to the topic
  const initialReplyContent = RandomGenerator.content({ paragraphs: 2 });
  const replyData = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: initialReplyContent,
  } satisfies IDiscussionBoardReply.ICreate;

  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyData,
      },
    );
  typia.assert(reply);

  // Step 6: Member updates the reply for the first time
  const firstEditContent = RandomGenerator.content({ paragraphs: 2 });
  const firstUpdateData = {
    content: firstEditContent,
  } satisfies IDiscussionBoardReply.IUpdate;

  const firstUpdatedReply =
    await api.functional.discussionBoard.member.topics.replies.update(
      connection,
      {
        topicId: topic.id,
        replyId: reply.id,
        body: firstUpdateData,
      },
    );
  typia.assert(firstUpdatedReply);

  // Step 7: Member updates the reply for the second time
  const secondEditContent = RandomGenerator.content({ paragraphs: 2 });
  const secondUpdateData = {
    content: secondEditContent,
  } satisfies IDiscussionBoardReply.IUpdate;

  const secondUpdatedReply =
    await api.functional.discussionBoard.member.topics.replies.update(
      connection,
      {
        topicId: topic.id,
        replyId: reply.id,
        body: secondUpdateData,
      },
    );
  typia.assert(secondUpdatedReply);

  // Step 8: Create unauthenticated connection and retrieve edit history
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const editHistoryRequest = {
    page: 1,
    limit: 10,
    sort_by: "created_at_asc",
  } satisfies IDiscussionBoardReply.IEditHistoryRequest;

  const editHistoryPage =
    await api.functional.discussionBoard.topics.replies.editHistory(
      unauthConn,
      {
        topicId: topic.id,
        replyId: reply.id,
        body: editHistoryRequest,
      },
    );
  typia.assert(editHistoryPage);

  // Step 9: Validate pagination structure
  TestValidator.predicate(
    "edit history pagination should have valid structure",
    editHistoryPage.pagination.current === 1 &&
      editHistoryPage.pagination.limit === 10,
  );

  TestValidator.predicate(
    "edit history should contain at least 2 records",
    editHistoryPage.data.length >= 2,
  );

  // Step 10: Validate edit history records
  const editRecords = editHistoryPage.data;

  for (const record of editRecords) {
    typia.assert<IDiscussionBoardEditHistory>(record);

    TestValidator.predicate(
      "edit record should have member ID",
      record.discussion_board_member_id === member.id,
    );

    TestValidator.predicate(
      "edit record should have entity type reply",
      record.entity_type === "reply",
    );

    TestValidator.predicate(
      "edit record should reference the correct reply",
      record.entity_id === reply.id,
    );

    TestValidator.predicate(
      "edit record should have previous content",
      typeof record.previous_content === "string" &&
        record.previous_content.length > 0,
    );

    TestValidator.predicate(
      "edit record should have new content",
      typeof record.new_content === "string" && record.new_content.length > 0,
    );

    TestValidator.predicate(
      "edit record should have created_at timestamp",
      typeof record.created_at === "string",
    );
  }

  // Step 11: Verify chronological ordering (ascending)
  if (editRecords.length >= 2) {
    const firstRecordTime = new Date(editRecords[0].created_at).getTime();
    const secondRecordTime = new Date(editRecords[1].created_at).getTime();

    TestValidator.predicate(
      "edit records should be in chronological ascending order",
      firstRecordTime <= secondRecordTime,
    );
  }

  // Step 12: Verify first edit transition
  const firstEdit = editRecords[0];
  TestValidator.equals(
    "first edit previous content should match initial reply content",
    firstEdit.previous_content,
    initialReplyContent,
  );

  TestValidator.equals(
    "first edit new content should match first update content",
    firstEdit.new_content,
    firstEditContent,
  );

  // Step 13: Verify second edit transition
  if (editRecords.length >= 2) {
    const secondEdit = editRecords[1];
    TestValidator.equals(
      "second edit previous content should match first edit content",
      secondEdit.previous_content,
      firstEditContent,
    );

    TestValidator.equals(
      "second edit new content should match second update content",
      secondEdit.new_content,
      secondEditContent,
    );
  }

  // Step 14: Test pagination with descending order
  const descendingRequest = {
    page: 1,
    limit: 10,
    sort_by: "created_at_desc",
  } satisfies IDiscussionBoardReply.IEditHistoryRequest;

  const descendingPage =
    await api.functional.discussionBoard.topics.replies.editHistory(
      unauthConn,
      {
        topicId: topic.id,
        replyId: reply.id,
        body: descendingRequest,
      },
    );
  typia.assert(descendingPage);

  // Step 15: Verify descending order
  const descendingRecords = descendingPage.data;
  if (descendingRecords.length >= 2) {
    const firstDescTime = new Date(descendingRecords[0].created_at).getTime();
    const secondDescTime = new Date(descendingRecords[1].created_at).getTime();

    TestValidator.predicate(
      "edit records should be in chronological descending order",
      firstDescTime >= secondDescTime,
    );
  }
}
