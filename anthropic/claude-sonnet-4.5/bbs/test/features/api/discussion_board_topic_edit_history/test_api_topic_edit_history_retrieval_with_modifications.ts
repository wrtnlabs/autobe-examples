import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEditHistory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardEditHistory";

/**
 * Test retrieving the complete edit history for a discussion topic that has
 * undergone multiple modifications over time.
 *
 * This test validates the transparency and accountability features of the
 * content evolution tracking system by:
 *
 * 1. Creating a member account for topic creation and editing
 * 2. Creating an administrator account for category creation
 * 3. Creating a discussion board category
 * 4. Creating an initial discussion topic
 * 5. Performing multiple edits on the topic (title, body, tags)
 * 6. Retrieving the edit history with pagination
 * 7. Verifying all edit records with complete snapshots
 * 8. Verifying editor information and timestamps
 * 9. Verifying chronological ordering of edits
 */
export async function test_api_topic_edit_history_retrieval_with_modifications(
  connection: api.IConnection,
) {
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const memberBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberBody,
  });
  typia.assert(member);

  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!@#";
  const adminUsername = RandomGenerator.alphaNumeric(12);

  const adminBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  await api.functional.auth.member.join(connection, {
    body: memberBody,
  });

  const initialTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const initialBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  const topicBody = {
    title: initialTitle,
    body: initialBody,
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topicBody,
    },
  );
  typia.assert(topic);

  const edit1Title = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const edit1Body = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  const update1Body = {
    title: edit1Title,
    body: edit1Body,
  } satisfies IDiscussionBoardTopic.IUpdate;

  const updatedTopic1 =
    await api.functional.discussionBoard.member.topics.update(connection, {
      topicId: topic.id,
      body: update1Body,
    });
  typia.assert(updatedTopic1);

  const edit2Body = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 12,
    sentenceMax: 20,
  });

  const update2Body = {
    body: edit2Body,
  } satisfies IDiscussionBoardTopic.IUpdate;

  const updatedTopic2 =
    await api.functional.discussionBoard.member.topics.update(connection, {
      topicId: topic.id,
      body: update2Body,
    });
  typia.assert(updatedTopic2);

  const edit3Title = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });

  const update3Body = {
    title: edit3Title,
  } satisfies IDiscussionBoardTopic.IUpdate;

  const updatedTopic3 =
    await api.functional.discussionBoard.member.topics.update(connection, {
      topicId: topic.id,
      body: update3Body,
    });
  typia.assert(updatedTopic3);

  const historyRequest = {
    page: 1,
    limit: 10,
    sort_by: "created_at_desc",
  } satisfies IDiscussionBoardTopic.IEditHistoryRequest;

  const editHistory = await api.functional.discussionBoard.topics.editHistory(
    connection,
    {
      topicId: topic.id,
      body: historyRequest,
    },
  );
  typia.assert(editHistory);

  TestValidator.predicate(
    "edit history should contain multiple records",
    editHistory.data.length > 0,
  );

  TestValidator.predicate(
    "edit history should contain expected number of edits",
    editHistory.data.length >= 3,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    editHistory.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match request",
    editHistory.pagination.limit,
    10,
  );

  for (const edit of editHistory.data) {
    TestValidator.equals(
      "edit entity ID should match topic ID",
      edit.entity_id,
      topic.id,
    );

    TestValidator.equals(
      "edit entity type should be topic",
      edit.entity_type,
      "topic",
    );

    TestValidator.equals(
      "editor should be the authenticated member",
      edit.discussion_board_member_id,
      member.id,
    );

    TestValidator.predicate(
      "previous content should differ from new content",
      edit.previous_content !== edit.new_content,
    );
  }

  if (editHistory.data.length > 1) {
    for (let i = 0; i < editHistory.data.length - 1; i++) {
      const current = new Date(editHistory.data[i].created_at);
      const next = new Date(editHistory.data[i + 1].created_at);

      TestValidator.predicate(
        "edits should be in chronological order (newest first)",
        current >= next,
      );
    }
  }

  const smallPageRequest = {
    page: 1,
    limit: 2,
    sort_by: "created_at_desc",
  } satisfies IDiscussionBoardTopic.IEditHistoryRequest;

  const smallPageHistory =
    await api.functional.discussionBoard.topics.editHistory(connection, {
      topicId: topic.id,
      body: smallPageRequest,
    });
  typia.assert(smallPageHistory);

  TestValidator.predicate(
    "pagination limit should be respected",
    smallPageHistory.data.length <= 2,
  );

  TestValidator.predicate(
    "pagination metadata should reflect total records",
    smallPageHistory.pagination.records >= editHistory.data.length,
  );

  const editorFilterRequest = {
    page: 1,
    limit: 10,
    editor_member_id: member.id,
    sort_by: "created_at_desc",
  } satisfies IDiscussionBoardTopic.IEditHistoryRequest;

  const filteredHistory =
    await api.functional.discussionBoard.topics.editHistory(connection, {
      topicId: topic.id,
      body: editorFilterRequest,
    });
  typia.assert(filteredHistory);

  TestValidator.predicate(
    "filtered history should only contain edits by specified member",
    filteredHistory.data.every(
      (edit) => edit.discussion_board_member_id === member.id,
    ),
  );
}
