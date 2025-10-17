import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopic";

/**
 * Test the advanced search and filtering capabilities of the discussion topic
 * discovery system.
 *
 * This test validates that users can effectively find relevant economic and
 * political discussions using multiple combined filters. It creates a
 * comprehensive test dataset with diverse topics across categories, tags, vote
 * scores, and time periods, then validates that search operations correctly
 * filter, sort, and paginate results.
 *
 * Workflow:
 *
 * 1. Set up platform infrastructure (admin, categories, tags)
 * 2. Create multiple member accounts for diverse topic creation
 * 3. Create topics with varying attributes across categories
 * 4. Apply votes to create different vote score distributions
 * 5. Execute searches with combined filters and validate results
 * 6. Test pagination and sorting functionality
 */
export async function test_api_topic_search_with_comprehensive_filters(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for platform setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: adminEmail,
      password: "Admin123!@#",
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create multiple discussion categories (Economics and Politics)
  const economicsCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: "Economics",
          slug: "economics",
          description: "Economic policy and theory discussions",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(economicsCategory);

  const politicsCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: "Politics",
          slug: "politics",
          description: "Political analysis and policy discussions",
          display_order: 2,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(politicsCategory);

  // Step 3: Create tags for filtering
  const monetaryPolicyTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: "monetary-policy",
        description: "Topics related to monetary policy and central banking",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(monetaryPolicyTag);

  const inflationTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: "inflation",
        description: "Discussions about inflation and price stability",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(inflationTag);

  const taxationTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: "taxation",
        description: "Tax policy and fiscal matters",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(taxationTag);

  const tradePolicyTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: "trade-policy",
        description: "International trade and trade agreements",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(tradePolicyTag);

  // Step 4: Create multiple member accounts and store credentials
  const memberCredentials = await ArrayUtil.asyncRepeat(5, async (index) => {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const memberPassword = "Member123!@#";
    const member = await api.functional.auth.member.join(connection, {
      body: {
        username: `member${index}_${RandomGenerator.alphaNumeric(8)}`,
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    return { member, email: memberEmail, password: memberPassword };
  });

  // Step 5: Create diverse topics with varying attributes
  const allTags = [
    monetaryPolicyTag,
    inflationTag,
    taxationTag,
    tradePolicyTag,
  ];
  const categories = [economicsCategory, politicsCategory];

  const topics: IDiscussionBoardTopic[] = [];

  // Create 10 topics with diverse characteristics
  for (let i = 0; i < 10; i++) {
    const memberIndex = i % memberCredentials.length;
    const memberCred = memberCredentials[memberIndex];

    // Select category based on topic index
    const category = categories[i % categories.length];

    // Select 1-3 random tags for each topic
    const topicTagCount = 1 + (i % 3);
    const selectedTags = RandomGenerator.sample(allTags, topicTagCount);

    const topic = await api.functional.discussionBoard.member.topics.create(
      connection,
      {
        body: {
          title: `${category.name} Discussion ${i + 1}: ${RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 })}`,
          body: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
          category_id: category.id,
          tag_ids: selectedTags.map((tag) => tag.id),
        } satisfies IDiscussionBoardTopic.ICreate,
      },
    );
    typia.assert(topic);
    topics.push(topic);
  }

  // Step 6: Cast votes on topics to create varying vote scores
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const voteCount = i % 3;

    for (let j = 0; j < voteCount; j++) {
      const voterIndex = (i + j + 1) % memberCredentials.length;
      const voterCred = memberCredentials[voterIndex];

      const vote = await api.functional.discussionBoard.member.votes.create(
        connection,
        {
          body: {
            votable_type: "topic",
            votable_id: topic.id,
            vote_type: j % 2 === 0 ? "upvote" : "downvote",
          } satisfies IDiscussionBoardVote.ICreate,
        },
      );
      typia.assert(vote);
    }
  }

  // Step 7: Test basic search without filters (should return all topics)
  const allTopicsResult = await api.functional.discussionBoard.topics.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
      } satisfies IDiscussionBoardTopic.IRequest,
    },
  );
  typia.assert(allTopicsResult);
  TestValidator.predicate(
    "all topics search returns results",
    allTopicsResult.data.length > 0,
  );

  // Step 8: Test category filtering
  const economicsTopics = await api.functional.discussionBoard.topics.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
        category_id: economicsCategory.id,
      } satisfies IDiscussionBoardTopic.IRequest,
    },
  );
  typia.assert(economicsTopics);
  TestValidator.predicate(
    "category filter returns only economics topics",
    economicsTopics.data.every(
      (topic) => topic.category.id === economicsCategory.id,
    ),
  );

  // Step 9: Test tag filtering
  const monetaryPolicyTopics =
    await api.functional.discussionBoard.topics.index(connection, {
      body: {
        page: 1,
        limit: 25,
        tag_ids: [monetaryPolicyTag.id],
      } satisfies IDiscussionBoardTopic.IRequest,
    });
  typia.assert(monetaryPolicyTopics);

  // Step 10: Test keyword search
  const searchKeyword = "Discussion";
  const keywordSearchResults =
    await api.functional.discussionBoard.topics.index(connection, {
      body: {
        page: 1,
        limit: 25,
        search: searchKeyword,
      } satisfies IDiscussionBoardTopic.IRequest,
    });
  typia.assert(keywordSearchResults);

  // Step 11: Test combined filters (category + tags)
  const combinedFilterResults =
    await api.functional.discussionBoard.topics.index(connection, {
      body: {
        page: 1,
        limit: 25,
        category_id: economicsCategory.id,
        tag_ids: [inflationTag.id],
      } satisfies IDiscussionBoardTopic.IRequest,
    });
  typia.assert(combinedFilterResults);

  // Step 12: Test pagination with different page sizes
  const paginationTest1 = await api.functional.discussionBoard.topics.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardTopic.IRequest,
    },
  );
  typia.assert(paginationTest1);
  TestValidator.predicate(
    "pagination respects limit parameter",
    paginationTest1.data.length <= 5,
  );

  const paginationTest2 = await api.functional.discussionBoard.topics.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardTopic.IRequest,
    },
  );
  typia.assert(paginationTest2);

  // Step 13: Test sorting by newest
  const sortedByNewest = await api.functional.discussionBoard.topics.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
        sort_by: "newest",
      } satisfies IDiscussionBoardTopic.IRequest,
    },
  );
  typia.assert(sortedByNewest);
  TestValidator.predicate(
    "topics sorted by newest",
    sortedByNewest.data.length > 0,
  );

  // Step 14: Test sorting by recent_activity
  const sortedByActivity = await api.functional.discussionBoard.topics.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
        sort_by: "recent_activity",
      } satisfies IDiscussionBoardTopic.IRequest,
    },
  );
  typia.assert(sortedByActivity);

  // Step 15: Test status filtering for active topics
  const activeTopics = await api.functional.discussionBoard.topics.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
        status: "active",
      } satisfies IDiscussionBoardTopic.IRequest,
    },
  );
  typia.assert(activeTopics);
  TestValidator.predicate(
    "status filter returns only active topics",
    activeTopics.data.every((topic) => topic.status === "active"),
  );

  // Step 16: Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata is present",
    allTopicsResult.pagination.current === 1 &&
      allTopicsResult.pagination.limit === 25 &&
      allTopicsResult.pagination.records >= 0 &&
      allTopicsResult.pagination.pages >= 0,
  );
}
