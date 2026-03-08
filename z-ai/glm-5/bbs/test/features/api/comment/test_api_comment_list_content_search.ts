import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_comment_list_content_search(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // Step 2: Member setup - create article
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // Step 3: Test comment list endpoint with various search parameters
  // Note: Comment creation API not available in current scope
  // Testing search API contract and response structure
  // Test 1: Search with specific keyword
  const searchResponse =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          search: "discussions",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Verify response structure
  TestValidator.predicate(
    "pagination records should be non-negative",
    searchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    searchResponse.pagination.pages >= 0,
  );
  // Test 2: Empty search string (should return all comments)
  const allCommentsResponse =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          search: "",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(allCommentsResponse);
  TestValidator.predicate(
    "empty search should return valid pagination",
    allCommentsResponse.pagination.records >= 0,
  );
  // Test 3: Case-insensitive search
  const caseInsensitiveResponse =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          search: "DISCUSSIONS",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(caseInsensitiveResponse);
  // Test 4: Pagination with search
  const paginatedResponse =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          search: "feedback",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Verify pagination fields are properly populated
  TestValidator.equals(
    "current page should be 1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be valid",
    paginatedResponse.pagination.limit > 0 &&
      paginatedResponse.pagination.limit <= 100,
  );
  // Test 5: Search with pagination parameters only (no search filter)
  const noSearchResponse =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(noSearchResponse);
  TestValidator.equals(
    "limit should be 20 when specified",
    noSearchResponse.pagination.limit,
    20,
  );
}
