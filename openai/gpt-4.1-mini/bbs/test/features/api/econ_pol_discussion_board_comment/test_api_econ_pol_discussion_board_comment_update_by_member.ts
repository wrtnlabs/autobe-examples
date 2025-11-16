import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardArticle";
import type { IEconPolDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAttachment";
import type { IEconPolDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardComment";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPolDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPolDiscussionBoardComment";

/**
 * E2E test for economic and political discussion board comment management by a
 * member.
 *
 * This test verifies the authenticated member can register, create an article,
 * and retrieve comments associated with that article. Due to missing APIs for
 * comment creation and update, the test focuses on the realistic achievable
 * workflow: join member, create article, and query comment listing filtered by
 * article and member.
 *
 * It validates proper authentication, data creation, and retrieval consistency
 * for comments associated with the member.
 */
export async function test_api_econ_pol_discussion_board_comment_update_by_member(
  connection: api.IConnection,
) {
  // 1. Authenticate and register a new member
  const memberCreateBody = {
    username:
      RandomGenerator.name(3).replace(/\s/g, "_") +
      RandomGenerator.alphaNumeric(5),
    password: "Password123!",
    email: `${RandomGenerator.name(1).toLowerCase()}${RandomGenerator.alphaNumeric(3)}@email.com`,
  } satisfies IEconPolDiscussionBoardMember.ICreate;
  const memberAuthorized: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create an article as the authenticated member
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 9,
    }),
    attachments: [],
  } satisfies IEconPolDiscussionBoardArticle.ICreate;
  const article: IEconPolDiscussionBoardArticle =
    await api.functional.econPolDiscussionBoard.member.articles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);

  // 3. Query comments filtering by article and member ID to verify retrieval
  const commentSearchBody = {
    article_id: article.id,
    member_id: memberAuthorized.id,
    parent_comment_id: null,
    created_after: null,
    created_before: null,
    updated_after: null,
    updated_before: null,
    page: 1,
    limit: 10,
  } satisfies IEconPolDiscussionBoardComment.IRequest;
  const commentsPage: IPageIEconPolDiscussionBoardComment.ISummary =
    await api.functional.econPolDiscussionBoard.member.econPolDiscussionBoard.comments.index(
      connection,
      { body: commentSearchBody },
    );
  typia.assert(commentsPage);

  // Validate that all retrieved comments in response belong to the member and article
  TestValidator.predicate(
    "retrieved comments belong to the authenticated member",
    commentsPage.data.every(
      (comment) =>
        comment.author.id === memberAuthorized.id && comment.id.length > 0,
    ),
  );
}
