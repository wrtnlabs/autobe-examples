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
 * Tests that multiple edits to a reply are properly tracked in edit history
 * with complete before/after snapshots and chronological ordering.
 *
 * This test validates the edit history tracking system for discussion replies,
 * ensuring transparency and auditability of content modifications which is
 * crucial for economic and political discussions.
 *
 * Workflow:
 *
 * 1. Administrator creates a category
 * 2. Member joins and authenticates
 * 3. Member creates a discussion topic
 * 4. Member posts an initial reply
 * 5. Member edits the reply multiple times (3+ edits) with different content
 *    changes
 * 6. Retrieve edit history with pagination
 * 7. Validate all edits are recorded in chronological order
 * 8. Verify each edit record contains complete before/after content snapshots
 * 9. Confirm editor information and timestamps are accurate
 * 10. Test filtering by date range to retrieve specific edit periods
 */
export async function test_api_reply_edit_history_multiple_edits_tracking(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates a category
  const adminData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_category_id: null,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 2: Member joins and authenticates
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Member creates a discussion topic
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // Step 4: Member posts an initial reply
  const originalContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const replyData = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: originalContent,
  } satisfies IDiscussionBoardReply.ICreate;

  const reply: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyData,
      },
    );
  typia.assert(reply);

  // Track content snapshots for validation
  const contentHistory: string[] = [originalContent];

  // Step 5: Member edits the reply multiple times (3+ edits)
  const editCount = 4;
  for (let i = 0; i < editCount; i++) {
    const newContent = RandomGenerator.paragraph({
      sentences: 5 + i,
      wordMin: 4,
      wordMax: 8,
    });
    contentHistory.push(newContent);

    const updateData = {
      content: newContent,
    } satisfies IDiscussionBoardReply.IUpdate;

    const updatedReply: IDiscussionBoardReply =
      await api.functional.discussionBoard.member.topics.replies.update(
        connection,
        {
          topicId: topic.id,
          replyId: reply.id,
          body: updateData,
        },
      );
    typia.assert(updatedReply);
  }

  // Step 6: Retrieve edit history with pagination (descending order - newest first)
  const editHistoryRequest = {
    page: 1,
    limit: 20,
    sort_by: "created_at_desc" as const,
  } satisfies IDiscussionBoardReply.IEditHistoryRequest;

  const editHistoryPage: IPageIDiscussionBoardEditHistory =
    await api.functional.discussionBoard.topics.replies.editHistory(
      connection,
      {
        topicId: topic.id,
        replyId: reply.id,
        body: editHistoryRequest,
      },
    );
  typia.assert(editHistoryPage);

  // Step 7: Validate all edits are recorded
  TestValidator.equals(
    "edit history should contain all edits",
    editHistoryPage.data.length,
    editCount,
  );

  TestValidator.equals(
    "pagination total records should match edit count",
    editHistoryPage.pagination.records,
    editCount,
  );

  // Step 8: Verify each edit record contains complete before/after content snapshots
  // Since we're using descending order, reverse to check chronologically
  const chronologicalEdits = [...editHistoryPage.data].reverse();

  for (let i = 0; i < chronologicalEdits.length; i++) {
    const editRecord: IDiscussionBoardEditHistory = chronologicalEdits[i];
    typia.assert(editRecord);

    // Verify previous_content matches the content before this edit
    TestValidator.equals(
      `edit ${i + 1} previous_content should match`,
      editRecord.previous_content,
      contentHistory[i],
    );

    // Verify new_content matches the content after this edit
    TestValidator.equals(
      `edit ${i + 1} new_content should match`,
      editRecord.new_content,
      contentHistory[i + 1],
    );

    // Verify editor member ID matches
    TestValidator.equals(
      `edit ${i + 1} editor should be the member`,
      editRecord.discussion_board_member_id,
      member.id,
    );

    // Verify entity_type is 'reply'
    TestValidator.equals(
      `edit ${i + 1} entity_type should be reply`,
      editRecord.entity_type,
      "reply",
    );

    // Verify entity_id matches the reply
    TestValidator.equals(
      `edit ${i + 1} entity_id should match reply`,
      editRecord.entity_id,
      reply.id,
    );

    // Verify timestamp exists and is valid
    TestValidator.predicate(
      `edit ${i + 1} should have valid created_at timestamp`,
      editRecord.created_at.length > 0,
    );

    // Verify deleted_at is null for active edit records
    TestValidator.equals(
      `edit ${i + 1} should not be deleted`,
      editRecord.deleted_at,
      null,
    );
  }

  // Step 9: Verify chronological ordering by checking timestamps
  for (let i = 1; i < chronologicalEdits.length; i++) {
    const previousEdit = chronologicalEdits[i - 1];
    const currentEdit = chronologicalEdits[i];

    TestValidator.predicate(
      `edit ${i + 1} timestamp should be after edit ${i}`,
      new Date(currentEdit.created_at).getTime() >=
        new Date(previousEdit.created_at).getTime(),
    );
  }

  // Step 10: Test filtering by date range
  if (chronologicalEdits.length >= 2) {
    const firstEditTime = new Date(chronologicalEdits[0].created_at);
    const lastEditTime = new Date(
      chronologicalEdits[chronologicalEdits.length - 1].created_at,
    );

    // Filter to get only middle edits (exclude first and last)
    const middleStartTime = new Date(firstEditTime.getTime() + 100);
    const middleEndTime = new Date(lastEditTime.getTime() - 100);

    const dateRangeRequest = {
      page: 1,
      limit: 20,
      start_date: middleStartTime.toISOString(),
      end_date: middleEndTime.toISOString(),
      sort_by: "created_at_asc" as const,
    } satisfies IDiscussionBoardReply.IEditHistoryRequest;

    const filteredHistory: IPageIDiscussionBoardEditHistory =
      await api.functional.discussionBoard.topics.replies.editHistory(
        connection,
        {
          topicId: topic.id,
          replyId: reply.id,
          body: dateRangeRequest,
        },
      );
    typia.assert(filteredHistory);

    // Verify date filtering worked
    TestValidator.predicate(
      "date range filtering should return subset of edits",
      filteredHistory.data.length <= editHistoryPage.data.length,
    );

    // Verify all returned edits are within the date range
    for (const edit of filteredHistory.data) {
      const editTime = new Date(edit.created_at);
      TestValidator.predicate(
        "filtered edit should be within date range",
        editTime >= middleStartTime && editTime <= middleEndTime,
      );
    }
  }

  // Test filtering by editor_member_id
  const editorFilterRequest = {
    page: 1,
    limit: 20,
    editor_member_id: member.id,
    sort_by: "created_at_asc" as const,
  } satisfies IDiscussionBoardReply.IEditHistoryRequest;

  const editorFilteredHistory: IPageIDiscussionBoardEditHistory =
    await api.functional.discussionBoard.topics.replies.editHistory(
      connection,
      {
        topicId: topic.id,
        replyId: reply.id,
        body: editorFilterRequest,
      },
    );
  typia.assert(editorFilteredHistory);

  // All edits should be from this member
  TestValidator.equals(
    "editor filter should return all edits from member",
    editorFilteredHistory.data.length,
    editCount,
  );

  for (const edit of editorFilteredHistory.data) {
    TestValidator.equals(
      "filtered edit should be from the specified member",
      edit.discussion_board_member_id,
      member.id,
    );
  }
}
