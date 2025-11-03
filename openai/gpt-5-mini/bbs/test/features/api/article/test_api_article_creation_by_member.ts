import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_article_creation_by_member(
  connection: api.IConnection,
) {
  /**
   * Test: Authenticated member can create an article in 'draft' state.
   *
   * Steps:
   *
   * 1. Register (join) a fresh member using POST /auth/member/join.
   * 2. Create an article (state: 'draft') using POST
   *    /discussionBoard/member/articles.
   * 3. Assert response shape via typia.assert and verify business properties:
   *
   *    - Title matches
   *    - Author summary exists and contains id and username
   */

  // 1) Register a new member (join) to obtain authorization context
  const joinBody = {
    username: RandomGenerator.name(1).replace(/\s+/g, "_").slice(0, 20),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "http://example.com/",
    referrer: "http://example.com/",
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2) Prepare article creation body (draft)
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 14,
      wordMin: 4,
      wordMax: 8,
    }),
    category_slug: null,
    tag_slugs: [] as string[],
    state: "draft",
  } satisfies IDiscussionBoardArticle.ICreate;

  // 3) Create article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: createBody,
    });
  typia.assert(article);

  // 4) Business validations
  TestValidator.equals(
    "created article title matches request",
    article.title,
    createBody.title,
  );

  // Ensure author summary exists and is a valid member summary
  typia.assert(article.author!);
  const author = typia.assert<IDiscussionBoardMember.ISummary>(article.author!);
  TestValidator.predicate(
    "author has id string",
    typeof author.id === "string",
  );
  TestValidator.predicate(
    "author has username string",
    typeof author.username === "string",
  );

  // Additional sanity checks
  TestValidator.predicate(
    "article has created_at",
    article.created_at !== undefined && article.created_at !== null,
  );
}
