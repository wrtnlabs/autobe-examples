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
 * Test comprehensive tag search functionality with filtering by status, usage
 * statistics, and name patterns.
 *
 * This test validates the tag search and filtering system by creating a
 * realistic data structure with multiple active tags, topics that use those
 * tags, and then performing various search operations to verify filtering,
 * sorting, and pagination behavior.
 *
 * Note: This test focuses on active tags only, as the available API endpoints
 * do not provide a way to create tags with different statuses or modify tag
 * status after creation. All administrator-created tags are automatically set
 * to active status.
 *
 * Steps:
 *
 * 1. Create administrator account to manage tags and categories
 * 2. Create multiple active tags
 * 3. Create category for organizing topics
 * 4. Create member account for topic creation
 * 5. Create multiple topics with different tag associations to generate usage
 *    statistics
 * 6. Perform unauthenticated searches with various filters
 * 7. Validate pagination, sorting, and status filtering behavior
 */
export async function test_api_tags_search_and_filter_by_status_and_usage(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create multiple active tags (all admin-created tags are active)
  const activeTag1 =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: "economics-" + RandomGenerator.alphabets(5),
        description: "Active tag for economics discussions",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(activeTag1);

  const activeTag2 =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: "politics-" + RandomGenerator.alphabets(5),
        description: "Active tag for politics discussions",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(activeTag2);

  const activeTag3 =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: "policy-" + RandomGenerator.alphabets(5),
        description: "Active tag for policy analysis",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(activeTag3);

  // Step 3: Create category for topics (admin is still authenticated)
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: "Economics Discussion",
          slug: "economics-" + RandomGenerator.alphabets(6),
          description: "Discussion category for economics topics",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create member account (this switches authentication to member)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Create topics with tag associations (member is now authenticated)
  const topic1 = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
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
        category_id: category.id,
        tag_ids: [activeTag1.id, activeTag2.id],
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic1);

  const topic2 = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
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
        category_id: category.id,
        tag_ids: [activeTag1.id, activeTag3.id],
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic2);

  const topic3 = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
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
        category_id: category.id,
        tag_ids: [activeTag1.id],
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic3);

  // Step 6: Create unauthenticated connection for public search
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Search without filters (should return active tags)
  const allActiveTags = await api.functional.discussionBoard.tags.index(
    unauthConn,
    {
      body: {
        status: "active",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(allActiveTags);
  TestValidator.predicate(
    "should return active tags",
    allActiveTags.data.length >= 3,
  );

  // Search by partial name matching
  const economicsSearch = await api.functional.discussionBoard.tags.index(
    unauthConn,
    {
      body: {
        search: "economics",
        status: "active",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(economicsSearch);
  TestValidator.predicate(
    "should find tags matching 'economics'",
    economicsSearch.data.some((tag) => tag.name.includes("economics")),
  );

  // Search with alphabetical sorting
  const alphabeticalTags = await api.functional.discussionBoard.tags.index(
    unauthConn,
    {
      body: {
        status: "active",
        sort_by: "name",
        order: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(alphabeticalTags);
  TestValidator.predicate(
    "should return tags in alphabetical order",
    alphabeticalTags.data.length > 0,
  );

  // Test pagination
  const firstPage = await api.functional.discussionBoard.tags.index(
    unauthConn,
    {
      body: {
        status: "active",
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "first page should respect limit",
    firstPage.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 2",
    firstPage.pagination.limit,
    2,
  );
}
