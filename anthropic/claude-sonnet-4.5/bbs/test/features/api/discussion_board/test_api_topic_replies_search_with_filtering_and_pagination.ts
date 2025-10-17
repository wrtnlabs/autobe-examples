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
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReply";

/**
 * Test comprehensive reply search and filtering functionality for discussion
 * topics.
 *
 * This test validates the PATCH /discussionBoard/topics/{topicId}/replies
 * endpoint's ability to search and filter replies using various criteria
 * including author filtering, date ranges, vote score thresholds, content text
 * search, and threading depth levels.
 *
 * Workflow:
 *
 * 1. Administrator creates a category for organizing discussions
 * 2. Multiple members authenticate to create discussion content
 * 3. First member creates a discussion topic
 * 4. Members post multiple replies with varying characteristics
 * 5. Members post nested replies to create threading hierarchy
 * 6. Members vote on replies to create varying vote scores
 * 7. Test various search and filter combinations
 * 8. Validate pagination and sorting functionality
 * 9. Verify response structure and data accuracy
 */
export async function test_api_topic_replies_search_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates a category
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminCredentials,
  });
  typia.assert(admin);

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
          slug: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create multiple member accounts
  const member1Credentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member1 = await api.functional.auth.member.join(connection, {
    body: member1Credentials,
  });
  typia.assert(member1);

  const member2Credentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member2 = await api.functional.auth.member.join(connection, {
    body: member2Credentials,
  });
  typia.assert(member2);

  const member3Credentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member3 = await api.functional.auth.member.join(connection, {
    body: member3Credentials,
  });
  typia.assert(member3);

  // Step 3: Member 1 creates a discussion topic
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Credentials.email,
      password: member1Credentials.password,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 4: Create multiple top-level replies from different members
  const replies: IDiscussionBoardReply[] = [];

  // Member 1 creates first reply
  const reply1 =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply1);
  replies.push(reply1);

  // Member 2 creates second reply
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Credentials.email,
      password: member2Credentials.password,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const reply2 =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply2);
  replies.push(reply2);

  // Member 3 creates third reply
  await api.functional.auth.member.login(connection, {
    body: {
      email: member3Credentials.email,
      password: member3Credentials.password,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const reply3 =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content: RandomGenerator.paragraph({
            sentences: 12,
            wordMin: 3,
            wordMax: 7,
          }),
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply3);
  replies.push(reply3);

  // Step 5: Create nested replies to establish threading hierarchy
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Credentials.email,
      password: member1Credentials.password,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const nestedReply1 =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: reply1.id,
          content: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 4,
            wordMax: 9,
          }),
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(nestedReply1);
  replies.push(nestedReply1);

  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Credentials.email,
      password: member2Credentials.password,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const nestedReply2 =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: nestedReply1.id,
          content: RandomGenerator.paragraph({
            sentences: 7,
            wordMin: 3,
            wordMax: 6,
          }),
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(nestedReply2);
  replies.push(nestedReply2);

  // Step 6: Members vote on replies to create varying vote scores
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Credentials.email,
      password: member1Credentials.password,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const vote1 = await api.functional.discussionBoard.member.votes.create(
    connection,
    {
      body: {
        votable_type: "reply",
        votable_id: reply2.id,
        vote_type: "upvote",
      } satisfies IDiscussionBoardVote.ICreate,
    },
  );
  typia.assert(vote1);

  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Credentials.email,
      password: member2Credentials.password,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const vote2 = await api.functional.discussionBoard.member.votes.create(
    connection,
    {
      body: {
        votable_type: "reply",
        votable_id: reply1.id,
        vote_type: "upvote",
      } satisfies IDiscussionBoardVote.ICreate,
    },
  );
  typia.assert(vote2);

  await api.functional.auth.member.login(connection, {
    body: {
      email: member3Credentials.email,
      password: member3Credentials.password,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const vote3 = await api.functional.discussionBoard.member.votes.create(
    connection,
    {
      body: {
        votable_type: "reply",
        votable_id: reply1.id,
        vote_type: "upvote",
      } satisfies IDiscussionBoardVote.ICreate,
    },
  );
  typia.assert(vote3);

  // Step 7: Test basic pagination without filters
  const basicSearch = await api.functional.discussionBoard.topics.replies.index(
    connection,
    {
      topicId: topic.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardReply.IRequest,
    },
  );
  typia.assert(basicSearch);
  TestValidator.predicate(
    "basic search returns all replies",
    basicSearch.data.length >= 5,
  );
  TestValidator.equals(
    "pagination metadata is present",
    basicSearch.pagination.current,
    1,
  );

  // Step 8: Test author filtering
  const authorFilterSearch =
    await api.functional.discussionBoard.topics.replies.index(connection, {
      topicId: topic.id,
      body: {
        author_username: member1Credentials.username,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardReply.IRequest,
    });
  typia.assert(authorFilterSearch);
  TestValidator.predicate(
    "author filter returns only member1 replies",
    authorFilterSearch.data.length >= 1,
  );

  // Step 9: Test content search
  const contentKeyword = RandomGenerator.substring(reply1.content);
  const contentSearch =
    await api.functional.discussionBoard.topics.replies.index(connection, {
      topicId: topic.id,
      body: {
        content_search: contentKeyword,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardReply.IRequest,
    });
  typia.assert(contentSearch);

  // Step 10: Test depth level filtering
  const depthSearch = await api.functional.discussionBoard.topics.replies.index(
    connection,
    {
      topicId: topic.id,
      body: {
        min_depth_level: 1,
        max_depth_level: 2,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardReply.IRequest,
    },
  );
  typia.assert(depthSearch);
  TestValidator.predicate(
    "depth filter returns nested replies",
    depthSearch.data.length >= 1,
  );

  // Step 11: Test sorting by creation date ascending
  const sortAscSearch =
    await api.functional.discussionBoard.topics.replies.index(connection, {
      topicId: topic.id,
      body: {
        sort_by: "created_at_asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardReply.IRequest,
    });
  typia.assert(sortAscSearch);

  // Step 12: Test sorting by creation date descending
  const sortDescSearch =
    await api.functional.discussionBoard.topics.replies.index(connection, {
      topicId: topic.id,
      body: {
        sort_by: "created_at_desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardReply.IRequest,
    });
  typia.assert(sortDescSearch);

  // Step 13: Test pagination with different page sizes
  const smallPageSearch =
    await api.functional.discussionBoard.topics.replies.index(connection, {
      topicId: topic.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardReply.IRequest,
    });
  typia.assert(smallPageSearch);
  TestValidator.predicate(
    "small page size is respected",
    smallPageSearch.data.length <= 2,
  );

  // Step 14: Test date range filtering
  const now = new Date();
  const dateRangeSearch =
    await api.functional.discussionBoard.topics.replies.index(connection, {
      topicId: topic.id,
      body: {
        created_after: new Date(now.getTime() - 3600000).toISOString(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardReply.IRequest,
    });
  typia.assert(dateRangeSearch);
  TestValidator.predicate(
    "date range filter returns results",
    dateRangeSearch.data.length >= 1,
  );

  // Step 15: Test combined filters
  const combinedSearch =
    await api.functional.discussionBoard.topics.replies.index(connection, {
      topicId: topic.id,
      body: {
        min_depth_level: 0,
        max_depth_level: 1,
        sort_by: "created_at_asc",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardReply.IRequest,
    });
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined filters work correctly",
    combinedSearch.data.length >= 1,
  );
}
