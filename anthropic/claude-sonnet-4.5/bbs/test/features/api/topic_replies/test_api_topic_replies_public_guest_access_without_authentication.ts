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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReply";

/**
 * Test that guest users can view discussion topic replies without
 * authentication.
 *
 * Validates the public read-only access model for reply content discovery,
 * ensuring unauthenticated users can browse discussions to encourage
 * registration.
 *
 * Workflow:
 *
 * 1. Administrator creates category
 * 2. Member creates topic and posts replies
 * 3. Guest (unauthenticated) retrieves replies
 * 4. Validate reply data visibility and pagination
 */
export async function test_api_topic_replies_public_guest_access_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Administrator authenticates and creates category
  const adminJoinData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinData,
    });
  typia.assert(admin);

  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
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

  // Step 2: Member authenticates and creates topic
  const memberJoinData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  await api.functional.auth.member.join(connection, {
    body: memberJoinData,
  });

  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // Step 3: Member posts several replies (top-level and nested)
  const replies: IDiscussionBoardReply[] = [];

  // Create 5 top-level replies
  for (let i = 0; i < 5; i++) {
    const replyData = {
      discussion_board_topic_id: topic.id,
      parent_reply_id: null,
      content: RandomGenerator.paragraph({ sentences: 5 }),
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
    replies.push(reply);
  }

  // Create 3 nested replies
  for (let i = 0; i < 3; i++) {
    const nestedReplyData = {
      discussion_board_topic_id: topic.id,
      parent_reply_id: replies[0].id,
      content: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IDiscussionBoardReply.ICreate;

    const nestedReply: IDiscussionBoardReply =
      await api.functional.discussionBoard.member.topics.replies.create(
        connection,
        {
          topicId: topic.id,
          body: nestedReplyData,
        },
      );
    typia.assert(nestedReply);
    replies.push(nestedReply);
  }

  // Step 4: Guest user (unauthenticated) retrieves replies
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const guestRequestBody = {
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardReply.IRequest;

  const guestRepliesPage: IPageIDiscussionBoardReply =
    await api.functional.discussionBoard.topics.replies.index(unauthConn, {
      topicId: topic.id,
      body: guestRequestBody,
    });
  typia.assert(guestRepliesPage);

  // Step 5: Validate guest receives reply data successfully
  TestValidator.predicate(
    "guest should receive replies",
    guestRepliesPage.data.length > 0,
  );
  TestValidator.equals(
    "guest should receive all replies",
    guestRepliesPage.data.length,
    replies.length,
  );

  // Step 6: Verify reply content and pagination metadata
  TestValidator.predicate(
    "pagination should be valid",
    guestRepliesPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "total records should match",
    guestRepliesPage.pagination.records === replies.length,
  );

  // Step 7: Test sorting functionality for guest users
  const sortedRequestAsc = {
    page: 1,
    limit: 50,
    sort_by: "created_at_asc" as const,
  } satisfies IDiscussionBoardReply.IRequest;

  const sortedRepliesAsc: IPageIDiscussionBoardReply =
    await api.functional.discussionBoard.topics.replies.index(unauthConn, {
      topicId: topic.id,
      body: sortedRequestAsc,
    });
  typia.assert(sortedRepliesAsc);

  TestValidator.predicate(
    "sorted ascending replies should be received",
    sortedRepliesAsc.data.length > 0,
  );

  // Step 8: Test filtering by depth level for guest users
  const depthFilterRequest = {
    page: 1,
    limit: 50,
    min_depth_level: 0,
    max_depth_level: 0,
  } satisfies IDiscussionBoardReply.IRequest;

  const topLevelReplies: IPageIDiscussionBoardReply =
    await api.functional.discussionBoard.topics.replies.index(unauthConn, {
      topicId: topic.id,
      body: depthFilterRequest,
    });
  typia.assert(topLevelReplies);

  TestValidator.predicate(
    "guest should receive only top-level replies",
    topLevelReplies.data.length === 5,
  );

  // Verify all top-level replies have depth 0
  for (const reply of topLevelReplies.data) {
    TestValidator.equals(
      "top-level reply depth should be 0",
      reply.depth_level,
      0,
    );
  }
}
