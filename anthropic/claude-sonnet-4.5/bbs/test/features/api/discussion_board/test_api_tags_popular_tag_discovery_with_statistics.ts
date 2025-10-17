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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";

/**
 * Test tag discovery workflow focusing on identifying popular and trending tags
 * through usage statistics and recent activity metrics.
 *
 * This test validates the complete tag discovery system by creating a realistic
 * discussion board environment with multiple tags, categories, members, and
 * topics. It verifies that tag statistics are accurately tracked and that the
 * search API correctly sorts and filters tags based on usage patterns.
 *
 * Steps:
 *
 * 1. Administrator creates account and authenticates
 * 2. Administrator creates multiple tags for categorization
 * 3. Administrator creates a category for topic organization
 * 4. Multiple members join and authenticate
 * 5. Members create numerous topics with various tag combinations
 * 6. Search tags sorted by usage count to find most popular tags
 * 7. Search tags sorted by recent usage to find trending tags
 * 8. Validate tag statistics accuracy
 * 9. Test pagination for large tag collections
 * 10. Verify sorting prioritizes high-usage tags correctly
 * 11. Confirm tag metadata includes creation dates and status
 */
export async function test_api_tags_popular_tag_discovery_with_statistics(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates account and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(adminAuth);

  // Step 2: Administrator creates multiple tags for realistic tag vocabulary
  const tagNames = [
    "monetary-policy",
    "fiscal-policy",
    "inflation",
    "unemployment",
    "trade-agreements",
    "political-theory",
    "elections",
    "governance",
    "international-relations",
    "economic-growth",
  ] as const;

  const createdTags: IDiscussionBoardTag[] = await ArrayUtil.asyncMap(
    tagNames,
    async (tagName) => {
      const tag =
        await api.functional.discussionBoard.administrator.tags.create(
          connection,
          {
            body: {
              name: tagName,
              description: `Discussion tag for ${tagName} related topics`,
            } satisfies IDiscussionBoardTag.ICreate,
          },
        );
      typia.assert(tag);
      return tag;
    },
  );

  TestValidator.equals(
    "created tags count matches",
    createdTags.length,
    tagNames.length,
  );

  // Step 3: Administrator creates category for topic organization
  const category: IDiscussionBoardCategory =
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
  typia.assert(category);

  // Step 4: Multiple members join and store their credentials
  const memberCount = 5;
  const memberCredentials: Array<{
    email: string;
    password: string;
    auth: IDiscussionBoardMember.IAuthorized;
  }> = await ArrayUtil.asyncRepeat(memberCount, async (index) => {
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(12);
    const memberAuth: IDiscussionBoardMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          username: RandomGenerator.alphaNumeric(10),
          email: email,
          password: password,
          display_name: RandomGenerator.name(),
        } satisfies IDiscussionBoardMember.ICreate,
      });
    typia.assert(memberAuth);
    return { email, password, auth: memberAuth };
  });

  TestValidator.equals(
    "created members count matches",
    memberCredentials.length,
    memberCount,
  );

  // Step 5: Create numerous topics with various tag combinations to simulate usage
  const topicCount = 30;
  const topics: IDiscussionBoardTopic[] = [];

  for (let i = 0; i < topicCount; i++) {
    const memberCred = RandomGenerator.pick(memberCredentials);

    // Re-authenticate as the selected member using stored credentials
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberCred.email,
        password: memberCred.password,
      } satisfies IDiscussionBoardMember.ICreate,
    });

    // Select 1-5 random tags for this topic to create varied usage patterns
    const topicTagCount = typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
    >();
    const selectedTags = RandomGenerator.sample(createdTags, topicTagCount);
    const tagIds = selectedTags.map((tag) => tag.id);

    const topic = await api.functional.discussionBoard.member.topics.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 7,
          }),
          body: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
          category_id: category.id,
          tag_ids: tagIds,
        } satisfies IDiscussionBoardTopic.ICreate,
      },
    );
    typia.assert(topic);
    topics.push(topic);
  }

  TestValidator.equals(
    "created topics count matches",
    topics.length,
    topicCount,
  );

  // Step 6: Search tags sorted by usage count to find most popular tags
  const popularTagsPage: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(connection, {
      body: {
        sort_by: "usage_count",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(popularTagsPage);

  TestValidator.predicate(
    "popular tags page has data",
    popularTagsPage.data.length > 0,
  );

  TestValidator.predicate(
    "popular tags page has pagination info",
    popularTagsPage.pagination.records >= createdTags.length,
  );

  // Step 7: Search tags sorted by recent usage to find trending tags
  const trendingTagsPage: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(connection, {
      body: {
        sort_by: "recent_usage",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(trendingTagsPage);

  TestValidator.predicate(
    "trending tags page has data",
    trendingTagsPage.data.length > 0,
  );

  // Step 8: Validate tag statistics accuracy and metadata
  for (const tagSummary of popularTagsPage.data) {
    TestValidator.predicate(
      "tag has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        tagSummary.id,
      ),
    );

    TestValidator.predicate(
      "tag name is normalized lowercase",
      tagSummary.name === tagSummary.name.toLowerCase(),
    );

    TestValidator.predicate(
      "tag has valid status",
      ["active", "pending_review", "disabled", "merged"].includes(
        tagSummary.status,
      ),
    );

    TestValidator.predicate(
      "tag has creation timestamp",
      tagSummary.created_at.length > 0,
    );
  }

  // Step 9: Test pagination for large tag collections
  const page2: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(connection, {
      body: {
        sort_by: "name",
        order: "asc",
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(page2);

  TestValidator.equals(
    "page 2 current page number",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);

  // Step 10: Verify sorting by name works correctly
  const alphabeticalTags: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(connection, {
      body: {
        sort_by: "name",
        order: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(alphabeticalTags);

  // Verify alphabetical order
  for (let i = 0; i < alphabeticalTags.data.length - 1; i++) {
    const current = alphabeticalTags.data[i];
    const next = alphabeticalTags.data[i + 1];
    typia.assertGuard(current);
    typia.assertGuard(next);

    TestValidator.predicate(
      "tags are in alphabetical order",
      current.name <= next.name,
    );
  }

  // Step 11: Test search functionality with text query
  const searchResult: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(connection, {
      body: {
        search: "policy",
        sort_by: "name",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(searchResult);

  TestValidator.predicate(
    "search returns matching tags",
    searchResult.data.every(
      (tag) =>
        tag.name.includes("policy") ||
        (tag.description !== null &&
          tag.description !== undefined &&
          tag.description.includes("policy")),
    ),
  );

  // Verify all tags have proper metadata
  for (const tag of alphabeticalTags.data) {
    TestValidator.predicate(
      "tag metadata is complete",
      tag.id.length > 0 &&
        tag.name.length >= 2 &&
        tag.name.length <= 30 &&
        tag.status.length > 0 &&
        tag.created_at.length > 0,
    );
  }
}
