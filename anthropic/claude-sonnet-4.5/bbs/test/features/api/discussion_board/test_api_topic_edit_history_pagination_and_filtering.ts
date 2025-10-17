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
 * Test pagination and filtering capabilities of topic edit history endpoint
 * with extensive modification histories.
 *
 * This test validates efficient navigation through large edit histories by
 * creating a topic, performing numerous edits, and then testing pagination,
 * filtering, and sorting features.
 *
 * Steps:
 *
 * 1. Create member account for topic authoring and editing
 * 2. Create administrator account for category setup
 * 3. Create category for topic organization
 * 4. Create initial topic
 * 5. Perform 12 edits to build substantial edit history
 * 6. Test pagination with various page sizes and page numbers
 * 7. Verify pagination metadata accuracy
 * 8. Test date range filtering
 * 9. Test sorting options (ascending/descending by creation time)
 * 10. Validate filtered results match criteria
 * 11. Verify pagination boundaries
 */
export async function test_api_topic_edit_history_pagination_and_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create administrator account and switch to admin context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass456!@#";

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create category (as administrator)
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: "Economics",
          slug: "economics",
          description: "Economic discussions and analysis",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to member authentication for topic operations
  connection.headers = { Authorization: member.token.access };

  // Step 4: Create initial topic (as member)
  const initialTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const initialBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
  });

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: initialTitle,
        body: initialBody,
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 5: Perform 12 edits to create substantial edit history
  const editTimestamps: string[] = [];
  const editCount = 12;

  for (let i = 0; i < editCount; i++) {
    const beforeEditTime = new Date().toISOString();

    const updatedTopic =
      await api.functional.discussionBoard.member.topics.update(connection, {
        topicId: topic.id,
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
        } satisfies IDiscussionBoardTopic.IUpdate,
      });
    typia.assert(updatedTopic);

    editTimestamps.push(beforeEditTime);

    // Small delay to ensure distinct timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 6 & 7: Test pagination with page size and verify metadata
  const pageSize = 5;
  const firstPage = await api.functional.discussionBoard.topics.editHistory(
    connection,
    {
      topicId: topic.id,
      body: {
        page: 1,
        limit: pageSize,
      } satisfies IDiscussionBoardTopic.IEditHistoryRequest,
    },
  );
  typia.assert(firstPage);

  // Verify pagination metadata
  TestValidator.equals(
    "first page current page number",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "total records should match edit count",
    firstPage.pagination.records,
    editCount,
  );
  TestValidator.equals(
    "total pages calculation",
    firstPage.pagination.pages,
    Math.ceil(editCount / pageSize),
  );
  TestValidator.equals(
    "first page data length",
    firstPage.data.length,
    pageSize,
  );

  // Test second page
  const secondPage = await api.functional.discussionBoard.topics.editHistory(
    connection,
    {
      topicId: topic.id,
      body: {
        page: 2,
        limit: pageSize,
      } satisfies IDiscussionBoardTopic.IEditHistoryRequest,
    },
  );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page current page number",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page data length",
    secondPage.data.length,
    pageSize,
  );

  // Test last page (partial)
  const lastPage = await api.functional.discussionBoard.topics.editHistory(
    connection,
    {
      topicId: topic.id,
      body: {
        page: 3,
        limit: pageSize,
      } satisfies IDiscussionBoardTopic.IEditHistoryRequest,
    },
  );
  typia.assert(lastPage);

  TestValidator.equals("last page data length", lastPage.data.length, 2);

  // Step 8: Test date range filtering
  const midPointIndex = Math.floor(editTimestamps.length / 2);
  const startDate = editTimestamps[midPointIndex];

  const dateFilteredResults =
    await api.functional.discussionBoard.topics.editHistory(connection, {
      topicId: topic.id,
      body: {
        start_date: startDate,
        limit: 20,
      } satisfies IDiscussionBoardTopic.IEditHistoryRequest,
    });
  typia.assert(dateFilteredResults);

  // Verify all filtered results are after start_date
  for (const edit of dateFilteredResults.data) {
    TestValidator.predicate(
      "edit timestamp after start_date",
      new Date(edit.created_at).getTime() >= new Date(startDate).getTime(),
    );
  }

  // Test end_date filtering
  const endDate = editTimestamps[editTimestamps.length - 3];
  const endDateFiltered =
    await api.functional.discussionBoard.topics.editHistory(connection, {
      topicId: topic.id,
      body: {
        end_date: endDate,
        limit: 20,
      } satisfies IDiscussionBoardTopic.IEditHistoryRequest,
    });
  typia.assert(endDateFiltered);

  // Step 9: Test sorting - descending (most recent first)
  const descendingSort =
    await api.functional.discussionBoard.topics.editHistory(connection, {
      topicId: topic.id,
      body: {
        sort_by: "created_at_desc",
        limit: 20,
      } satisfies IDiscussionBoardTopic.IEditHistoryRequest,
    });
  typia.assert(descendingSort);

  // Verify descending order
  for (let i = 0; i < descendingSort.data.length - 1; i++) {
    TestValidator.predicate(
      "descending order verification",
      new Date(descendingSort.data[i].created_at).getTime() >=
        new Date(descendingSort.data[i + 1].created_at).getTime(),
    );
  }

  // Test sorting - ascending (oldest first)
  const ascendingSort = await api.functional.discussionBoard.topics.editHistory(
    connection,
    {
      topicId: topic.id,
      body: {
        sort_by: "created_at_asc",
        limit: 20,
      } satisfies IDiscussionBoardTopic.IEditHistoryRequest,
    },
  );
  typia.assert(ascendingSort);

  // Verify ascending order
  for (let i = 0; i < ascendingSort.data.length - 1; i++) {
    TestValidator.predicate(
      "ascending order verification",
      new Date(ascendingSort.data[i].created_at).getTime() <=
        new Date(ascendingSort.data[i + 1].created_at).getTime(),
    );
  }

  // Step 10: Test filtering by editor (member ID)
  const editorFiltered =
    await api.functional.discussionBoard.topics.editHistory(connection, {
      topicId: topic.id,
      body: {
        editor_member_id: member.id,
        limit: 20,
      } satisfies IDiscussionBoardTopic.IEditHistoryRequest,
    });
  typia.assert(editorFiltered);

  // Verify all edits are by the specified member
  for (const edit of editorFiltered.data) {
    TestValidator.equals(
      "editor member ID matches filter",
      edit.discussion_board_member_id,
      member.id,
    );
  }

  // Step 11: Verify pagination boundaries - request beyond available pages
  const beyondLastPage =
    await api.functional.discussionBoard.topics.editHistory(connection, {
      topicId: topic.id,
      body: {
        page: 100,
        limit: pageSize,
      } satisfies IDiscussionBoardTopic.IEditHistoryRequest,
    });
  typia.assert(beyondLastPage);

  TestValidator.equals(
    "beyond last page returns empty data",
    beyondLastPage.data.length,
    0,
  );

  // Test combined filtering: date range + sorting + pagination
  const combinedFilter =
    await api.functional.discussionBoard.topics.editHistory(connection, {
      topicId: topic.id,
      body: {
        start_date: editTimestamps[2],
        end_date: editTimestamps[editTimestamps.length - 2],
        sort_by: "created_at_desc",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardTopic.IEditHistoryRequest,
    });
  typia.assert(combinedFilter);

  // Verify combined filter results
  TestValidator.predicate(
    "combined filter returns results",
    combinedFilter.data.length > 0,
  );

  for (const edit of combinedFilter.data) {
    const editTime = new Date(edit.created_at).getTime();
    const startTime = new Date(editTimestamps[2]).getTime();
    const endTime = new Date(
      editTimestamps[editTimestamps.length - 2],
    ).getTime();

    TestValidator.predicate(
      "combined filter date range check",
      editTime >= startTime && editTime <= endTime,
    );
  }
}
