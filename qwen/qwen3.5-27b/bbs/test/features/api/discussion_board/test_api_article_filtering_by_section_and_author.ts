import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test article filtering capabilities by section and author for authenticated members.
 *
 * This test validates the PATCH /discussionBoard/articles endpoint filtering functionality:
 * 1. Filters articles by section_id to ensure only articles from specified section are returned
 * 2. Filters articles by author_id to ensure only articles by specified member are returned
 * 3. Tests combined filtering with both section_id and author_id (AND logic)
 * 4. Validates response structure includes proper pagination and article summaries
 */
export async function test_api_article_filtering_by_section_and_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Store member ID for author filtering
  const memberId = memberAuth.id;
  // 2. Test section filtering
  const sectionFilterRequest = {
    section_id: typia.random<string & tags.Format<"uuid">>(),
    limit: 20,
  } satisfies IDiscussionBoardArticle.IRequest;
  const sectionFilteredResult =
    await api.functional.discussionBoard.articles.index(memberConnection, {
      body: sectionFilterRequest,
    });
  typia.assert(sectionFilteredResult);
  // Validate section filtering - all articles should belong to the specified section
  TestValidator.predicate("section filter returns valid pagination", () => {
    return (
      sectionFilteredResult.pagination.current >= 1 &&
      sectionFilteredResult.pagination.limit > 0 &&
      sectionFilteredResult.pagination.records >= 0 &&
      sectionFilteredResult.pagination.pages >= 0
    );
  });
  // If articles exist, validate they all match the section filter
  if (sectionFilteredResult.data.length > 0) {
    TestValidator.equals(
      "all articles match section filter",
      sectionFilteredResult.data.every(
        (article) => article.section.id === sectionFilterRequest.section_id,
      ),
      true,
    );
  }
  // 3. Test author filtering
  const authorFilterRequest = {
    author_id: memberId,
    limit: 20,
  } satisfies IDiscussionBoardArticle.IRequest;
  const authorFilteredResult =
    await api.functional.discussionBoard.articles.index(memberConnection, {
      body: authorFilterRequest,
    });
  typia.assert(authorFilteredResult);
  // Validate author filtering - all articles should be authored by the specified member
  TestValidator.predicate("author filter returns valid pagination", () => {
    return (
      authorFilteredResult.pagination.current >= 1 &&
      authorFilteredResult.pagination.limit > 0 &&
      authorFilteredResult.pagination.records >= 0 &&
      authorFilteredResult.pagination.pages >= 0
    );
  });
  // If articles exist, validate they all match the author filter
  if (authorFilteredResult.data.length > 0) {
    TestValidator.equals(
      "all articles match author filter",
      authorFilteredResult.data.every(
        (article) => article.author.id === authorFilterRequest.author_id,
      ),
      true,
    );
  }
  // 4. Test combined filtering (section_id AND author_id)
  const combinedFilterRequest = {
    section_id: typia.random<string & tags.Format<"uuid">>(),
    author_id: memberId,
    limit: 20,
  } satisfies IDiscussionBoardArticle.IRequest;
  const combinedFilteredResult =
    await api.functional.discussionBoard.articles.index(memberConnection, {
      body: combinedFilterRequest,
    });
  typia.assert(combinedFilteredResult);
  // Validate combined filtering - all articles should match both criteria
  TestValidator.predicate("combined filter returns valid pagination", () => {
    return (
      combinedFilteredResult.pagination.current >= 1 &&
      combinedFilteredResult.pagination.limit > 0 &&
      combinedFilteredResult.pagination.records >= 0 &&
      combinedFilteredResult.pagination.pages >= 0
    );
  });
  // If articles exist, validate they match BOTH section and author filters
  if (combinedFilteredResult.data.length > 0) {
    TestValidator.equals(
      "all articles match combined section and author filter",
      combinedFilteredResult.data.every(
        (article) =>
          article.section.id === combinedFilterRequest.section_id &&
          article.author.id === combinedFilterRequest.author_id,
      ),
      true,
    );
  }
  // 5. Test empty results with non-existent filters
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  const emptyFilterRequest = {
    section_id: nonExistentSectionId,
    author_id: typia.random<string & tags.Format<"uuid">>(),
    limit: 20,
  } satisfies IDiscussionBoardArticle.IRequest;
  const emptyFilterResult = await api.functional.discussionBoard.articles.index(
    memberConnection,
    { body: emptyFilterRequest },
  );
  typia.assert(emptyFilterResult);
  // Validate empty results are handled correctly
  TestValidator.predicate("empty filter returns valid response", () => {
    return (
      emptyFilterResult.pagination.current >= 1 &&
      emptyFilterResult.pagination.limit > 0 &&
      emptyFilterResult.pagination.records >= 0 &&
      emptyFilterResult.pagination.pages >= 0
    );
  });
  // If data exists, it should match both filters (AND logic)
  if (emptyFilterResult.data.length > 0) {
    TestValidator.equals(
      "filtered articles match both section and author",
      emptyFilterResult.data.every(
        (article) =>
          article.section.id === emptyFilterRequest.section_id &&
          article.author.id === emptyFilterRequest.author_id,
      ),
      true,
    );
  }
}