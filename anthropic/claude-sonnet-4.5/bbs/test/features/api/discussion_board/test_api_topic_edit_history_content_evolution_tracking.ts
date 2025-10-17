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
 * Test that edit history accurately captures before and after content snapshots
 * for topic modifications, supporting content verification and understanding
 * how discussions evolved.
 *
 * This test validates the complete edit history workflow:
 *
 * 1. Create member account for topic authorship and editing
 * 2. Create administrator account for category management
 * 3. Create category for topic organization
 * 4. Create initial topic with baseline content
 * 5. Perform multiple edits modifying various topic fields
 * 6. Retrieve edit history and verify complete content snapshots
 * 7. Validate timeline reconstruction capability
 * 8. Verify chronological ordering and pagination
 */
export async function test_api_topic_edit_history_content_evolution_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create member account for topic authorship and editing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const adminData = {
    username: RandomGenerator.alphaNumeric(12),
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 3: Create category for topic organization (using admin auth)
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // Create second category for category reassignment test
  const category2Data = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category2 =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      { body: category2Data },
    );
  typia.assert(category2);

  // Switch to member authentication for topic operations
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);

  // Step 4: Create initial topic with baseline content
  const initialTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const initialBody = RandomGenerator.content({ paragraphs: 3 });

  const topicData = {
    title: initialTitle,
    body: initialBody,
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    { body: topicData },
  );
  typia.assert(topic);

  // Step 5: Perform multiple edits modifying various topic fields

  // Edit 1: Change title only
  const newTitle1 = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const edit1Data = {
    title: newTitle1,
  } satisfies IDiscussionBoardTopic.IUpdate;

  const updatedTopic1 =
    await api.functional.discussionBoard.member.topics.update(connection, {
      topicId: topic.id,
      body: edit1Data,
    });
  typia.assert(updatedTopic1);

  // Edit 2: Modify body content
  const newBody2 = RandomGenerator.content({ paragraphs: 4 });
  const edit2Data = {
    body: newBody2,
  } satisfies IDiscussionBoardTopic.IUpdate;

  const updatedTopic2 =
    await api.functional.discussionBoard.member.topics.update(connection, {
      topicId: topic.id,
      body: edit2Data,
    });
  typia.assert(updatedTopic2);

  // Edit 3: Update category assignment
  const edit3Data = {
    category_id: category2.id,
  } satisfies IDiscussionBoardTopic.IUpdate;

  const updatedTopic3 =
    await api.functional.discussionBoard.member.topics.update(connection, {
      topicId: topic.id,
      body: edit3Data,
    });
  typia.assert(updatedTopic3);

  // Edit 4: Comprehensive edit changing multiple fields
  const newTitle4 = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const newBody4 = RandomGenerator.content({ paragraphs: 2 });

  const edit4Data = {
    title: newTitle4,
    body: newBody4,
    category_id: category.id,
  } satisfies IDiscussionBoardTopic.IUpdate;

  const updatedTopic4 =
    await api.functional.discussionBoard.member.topics.update(connection, {
      topicId: topic.id,
      body: edit4Data,
    });
  typia.assert(updatedTopic4);

  // Step 6: Retrieve edit history
  const editHistoryRequest = {
    page: 1,
    limit: 50,
    sort_by: "created_at_asc" as const,
  } satisfies IDiscussionBoardTopic.IEditHistoryRequest;

  const editHistoryPage =
    await api.functional.discussionBoard.topics.editHistory(connection, {
      topicId: topic.id,
      body: editHistoryRequest,
    });
  typia.assert(editHistoryPage);

  // Step 7: Validate edit history structure and content snapshots
  TestValidator.predicate(
    "edit history should contain records for all edits",
    editHistoryPage.data.length > 0,
  );

  // Verify pagination structure
  TestValidator.predicate(
    "pagination should indicate available records",
    editHistoryPage.pagination.records >= 4,
  );

  // Validate each edit record contains complete snapshots
  for (const editRecord of editHistoryPage.data) {
    // Verify required fields exist
    TestValidator.predicate(
      "edit record should have unique identifier",
      typeof editRecord.id === "string" && editRecord.id.length > 0,
    );

    TestValidator.predicate(
      "edit record should identify the editor",
      editRecord.discussion_board_member_id === member.id,
    );

    TestValidator.predicate(
      "edit record should specify entity type as topic",
      editRecord.entity_type === "topic",
    );

    TestValidator.predicate(
      "edit record should reference the correct topic",
      editRecord.entity_id === topic.id,
    );

    // Verify complete content snapshots exist
    TestValidator.predicate(
      "edit record should contain previous content snapshot",
      typeof editRecord.previous_content === "string" &&
        editRecord.previous_content.length > 0,
    );

    TestValidator.predicate(
      "edit record should contain new content snapshot",
      typeof editRecord.new_content === "string" &&
        editRecord.new_content.length > 0,
    );

    // Verify timestamp exists
    TestValidator.predicate(
      "edit record should have creation timestamp",
      typeof editRecord.created_at === "string" &&
        editRecord.created_at.length > 0,
    );
  }

  // Step 8: Verify timeline reconstruction capability
  TestValidator.predicate(
    "edit history should contain multiple records for timeline reconstruction",
    editHistoryPage.data.length > 1,
  );

  // Verify content evolution: each edit's content snapshots should differ
  TestValidator.predicate(
    "edit records should show content evolution",
    editHistoryPage.data.every(
      (record) => record.previous_content !== record.new_content,
    ),
  );

  // Step 9: Test edit history filtering and pagination
  const limitedHistoryRequest = {
    page: 1,
    limit: 2,
    sort_by: "created_at_desc" as const,
  } satisfies IDiscussionBoardTopic.IEditHistoryRequest;

  const limitedHistoryPage =
    await api.functional.discussionBoard.topics.editHistory(connection, {
      topicId: topic.id,
      body: limitedHistoryRequest,
    });
  typia.assert(limitedHistoryPage);

  TestValidator.predicate(
    "limited query should respect pagination limit",
    limitedHistoryPage.data.length <= 2,
  );

  TestValidator.equals(
    "pagination limit should match request",
    limitedHistoryPage.pagination.limit,
    2,
  );

  // Verify descending order
  if (limitedHistoryPage.data.length >= 2) {
    const firstTimestamp = new Date(
      limitedHistoryPage.data[0].created_at,
    ).getTime();
    const secondTimestamp = new Date(
      limitedHistoryPage.data[1].created_at,
    ).getTime();

    TestValidator.predicate(
      "descending sort should show most recent edits first",
      firstTimestamp >= secondTimestamp,
    );
  }
}
