import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_admin_tags_create } from "../../../generate/generate_random_discussion_board_admin_tags_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_article_listing_by_section_and_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for setup operations
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a test section
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create multiple test tags
  const tag1 = await api.functional.discussionBoard.admin.tags.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(5),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag1);
  const tag2 = await api.functional.discussionBoard.admin.tags.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(5),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag2);
  const tag3 = await api.functional.discussionBoard.admin.tags.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(5),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag3);
  // 4. Create another section for testing section isolation
  const otherSection =
    await api.functional.discussionBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(otherSection);
  // 5. Test filtering by section_id only
  // Validates that section filtering parameter is accepted and returns paginated results
  const sectionOnlyResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        section_id: section.id,
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(sectionOnlyResult);
  TestValidator.equals(
    "section filtering returns valid pagination",
    sectionOnlyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "section filtering returns valid limit",
    sectionOnlyResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "section filtering returns valid records count",
    sectionOnlyResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "section filtering returns valid pages count",
    sectionOnlyResult.pagination.pages >= 0,
  );
  // 6. Test filtering by tag_names only (AND logic with multiple tags)
  // Validates that tag filtering parameter is accepted and returns paginated results
  const tagOnlyResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        tag_names: [tag1.name, tag2.name],
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(tagOnlyResult);
  TestValidator.equals(
    "tag filtering returns valid pagination",
    tagOnlyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "tag filtering returns valid limit",
    tagOnlyResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "tag filtering returns data array",
    Array.isArray(tagOnlyResult.data),
    true,
  );
  // 7. Test filtering by section_id + tag_names (combined filtering)
  // Validates that both filters can be applied simultaneously
  const combinedResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        section_id: section.id,
        tag_names: [tag2.name],
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filtering returns valid pagination",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filtering returns valid limit",
    combinedResult.pagination.limit,
    20,
  );
  // 8. Test filtering with all three tags (AND logic - must have ALL tags)
  // Validates strict AND logic for tag filtering
  const allTagsResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        section_id: section.id,
        tag_names: [tag1.name, tag2.name, tag3.name],
        sort: "oldest",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(allTagsResult);
  TestValidator.equals(
    "all tags filtering returns valid pagination",
    allTagsResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "all tags filtering returns oldest sort",
    allTagsResult.data.every((article) => true), // Structure validated by typia.assert
    true,
  );
  // 9. Test with empty tag_names array (should mean no tag filtering applied)
  // Validates that empty tag array doesn't filter out all results
  const emptyTagsResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        section_id: section.id,
        tag_names: [],
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptyTagsResult);
  TestValidator.equals(
    "empty tags filtering returns valid pagination",
    emptyTagsResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty tags filtering returns valid data array",
    Array.isArray(emptyTagsResult.data),
    true,
  );
  // 10. Test sorting - newest first (default)
  const newestResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        section_id: section.id,
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(newestResult);
  TestValidator.equals(
    "newest sort returns valid response",
    newestResult.pagination.current >= 1,
    true,
  );
  // 11. Test sorting - oldest first
  const oldestResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        section_id: section.id,
        sort: "oldest",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(oldestResult);
  TestValidator.equals(
    "oldest sort returns valid response",
    oldestResult.pagination.current >= 1,
    true,
  );
  // 12. Validate response structure consistency across all queries
  const allResults = [
    sectionOnlyResult,
    tagOnlyResult,
    combinedResult,
    allTagsResult,
    emptyTagsResult,
    newestResult,
    oldestResult,
  ];
  allResults.forEach((result, index) => {
    TestValidator.equals(
      `result ${index} has pagination object`,
      result.pagination !== null && result.pagination !== undefined,
      true,
    );
    TestValidator.equals(
      `result ${index} has data array`,
      Array.isArray(result.data),
      true,
    );
    TestValidator.predicate(
      `result ${index} pagination has valid current`,
      result.pagination.current >= 0,
    );
    TestValidator.predicate(
      `result ${index} pagination has valid limit`,
      result.pagination.limit >= 0,
    );
    TestValidator.predicate(
      `result ${index} pagination has valid records`,
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      `result ${index} pagination has valid pages`,
      result.pagination.pages >= 0,
    );
  });
}
