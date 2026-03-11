import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test article search functionality with tag-based filtering.
 *
 * This test verifies that articles are correctly filtered by specified tags
 * using case-insensitive matching and OR logic for multiple tags.
 *
 * Test Flow:
 * 1. Member authentication and setup
 * 2. Create articles with various tags (typescript, javascript, react, python)
 * 3. Search with single tag filter - verify only matching articles returned
 * 4. Search with multiple tags - verify OR logic (any match included)
 * 5. Search with case variation - verify case-insensitive matching
 * 6. Search without tags - verify all articles returned
 */
export async function test_api_article_search_with_tag_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create articles with different tags for testing
  const articleWithTypescript =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          tags: ["typescript", "backend"],
        },
      },
    );
  typia.assert(articleWithTypescript);
  const articleWithJavascript =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          tags: ["javascript", "frontend"],
        },
      },
    );
  typia.assert(articleWithJavascript);
  const articleWithReact =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          tags: ["react", "frontend"],
        },
      },
    );
  typia.assert(articleWithReact);
  const articleWithPython =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          tags: ["python", "backend"],
        },
      },
    );
  typia.assert(articleWithPython);
  const articleNoTags =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          tags: [],
        },
      },
    );
  typia.assert(articleNoTags);
  // 3. Search with single tag filter - should return only typescript articles
  const typescriptSearch =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          tags: ["typescript"],
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(typescriptSearch);
  TestValidator.predicate(
    "typescript search returns articles",
    () => typescriptSearch.data.length > 0,
  );
  const allHaveTypescriptTag = typescriptSearch.data.every((article) =>
    article.tags.some((tag) => tag.toLowerCase() === "typescript"),
  );
  TestValidator.predicate(
    "all results have typescript tag",
    () => allHaveTypescriptTag,
  );
  // 4. Search with multiple tags - OR logic (typescript OR python)
  const multiTagSearch =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          tags: ["typescript", "python"],
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(multiTagSearch);
  TestValidator.predicate(
    "multi-tag search returns articles",
    () => multiTagSearch.data.length >= 2,
  );
  const allMatchEitherTag = multiTagSearch.data.every((article) =>
    article.tags.some(
      (tag) =>
        tag.toLowerCase() === "typescript" || tag.toLowerCase() === "python",
    ),
  );
  TestValidator.predicate(
    "all results match typescript or python",
    () => allMatchEitherTag,
  );
  // 5. Search with case variation - verify case-insensitive matching
  const caseInsensitiveSearch =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          tags: ["TYPESCRIPT", "JavaScript"],
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(caseInsensitiveSearch);
  TestValidator.predicate(
    "case-insensitive search returns articles",
    () => caseInsensitiveSearch.data.length >= 2,
  );
  const allMatchCaseInsensitive = caseInsensitiveSearch.data.every((article) =>
    article.tags.some(
      (tag) =>
        tag.toLowerCase() === "typescript" ||
        tag.toLowerCase() === "javascript",
    ),
  );
  TestValidator.predicate(
    "case-insensitive matching works",
    () => allMatchCaseInsensitive,
  );
  // 6. Search without tags - should return all articles
  const allArticlesSearch =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(allArticlesSearch);
  TestValidator.predicate(
    "no-tag search returns all articles",
    () => allArticlesSearch.data.length >= 5,
  );
  // 7. Search with empty tags array - should return all articles
  const emptyTagsSearch =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          tags: [],
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptyTagsSearch);
  TestValidator.predicate(
    "empty tags array returns all articles",
    () => emptyTagsSearch.data.length >= 5,
  );
  // 8. Verify tag filtering excludes non-matching articles
  const frontendSearch =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          tags: ["frontend"],
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(frontendSearch);
  const noBackendInFrontendSearch = !frontendSearch.data.some((article) =>
    article.tags.some(
      (tag) =>
        tag.toLowerCase() === "backend" &&
        !article.tags.some((t) => t.toLowerCase() === "frontend"),
    ),
  );
  TestValidator.predicate(
    "frontend search excludes pure backend articles",
    () =>
      frontendSearch.data.every((article) =>
        article.tags.some((tag) => tag.toLowerCase() === "frontend"),
      ),
  );
}
