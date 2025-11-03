import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Validate public listing of comments for an article.
 *
 * Business scenario:
 *
 * 1. Create a fresh member (join) and let SDK handle token wiring.
 * 2. Create an article as that member.
 * 3. Create two comments under the article as the member.
 * 4. As an anonymous caller (empty headers), call the public comment listing
 *    endpoint (PATCH /discussionBoard/articles/:articleId/comments) with
 *    pagination and verify that created comments are returned, author summary
 *    fields are present, and hidden/deleted comments are not exposed.
 */
export async function test_api_comments_list_public_for_article(
  connection: api.IConnection,
) {
  // 1) Member join (registration)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.alphaNumeric(8);
  const joinBody = {
    username: memberUsername,
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member join returns an id and token",
    typeof member.id === "string" && typeof member.token?.access === "string",
  );

  // 2) Create an article as the member
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    // do not provide category_slug/tag_slugs unless needed
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleCreateBody,
    });
  typia.assert(article);
  TestValidator.predicate(
    "created article has id",
    typeof article.id === "string",
  );

  // 3) Create two visible comments under the article as the member
  const commentBody1 = {
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment1: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentBody1,
      },
    );
  typia.assert(comment1);
  TestValidator.predicate(
    "first comment has id",
    typeof comment1.id === "string",
  );

  const commentBody2 = {
    content: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment2: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentBody2,
      },
    );
  typia.assert(comment2);
  TestValidator.predicate(
    "second comment has id",
    typeof comment2.id === "string",
  );

  // 4) Public listing: anonymous connection
  const anonymousConn: api.IConnection = { ...connection, headers: {} };

  const listRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardComment.IRequest;

  const page: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(
      anonymousConn,
      {
        articleId: article.id,
        body: listRequest,
      },
    );
  // Validate response type
  typia.assert(page);

  // 5) Business validations
  // Pagination metadata sanity checks
  TestValidator.predicate(
    "pagination present and current page is 1",
    page.pagination !== null && page.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    page.pagination.limit === 20,
  );

  // The created comments should be present in the returned data array
  const found1 = page.data.find((c) => c.id === comment1.id);
  const found2 = page.data.find((c) => c.id === comment2.id);

  TestValidator.predicate(
    "public listing contains first created comment",
    found1 !== undefined,
  );
  TestValidator.predicate(
    "public listing contains second created comment",
    found2 !== undefined,
  );

  // Ensure that none of the returned comments are hidden (public listing must
  // exclude isHidden === true)
  TestValidator.predicate(
    "no hidden comments are exposed to public",
    page.data.every((c) => c.isHidden !== true),
  );

  // Ensure author summary exists and has expected public fields for present items
  const dataToCheck = page.data.filter(
    (c) => c.author !== null && c.author !== undefined,
  );
  if (dataToCheck.length > 0) {
    for (const item of dataToCheck) {
      TestValidator.predicate(
        `comment ${item.id} has author id`,
        typeof item.author!.id === "string",
      );
      TestValidator.predicate(
        `comment ${item.id} has username`,
        typeof item.author!.username === "string",
      );
      // display_name may be undefined | null; acceptable as public summary
    }
  }

  // Ensure at least the two created comments contributed to the total records
  TestValidator.predicate(
    "returned records include created comments",
    !!found1 && !!found2,
  );
}
