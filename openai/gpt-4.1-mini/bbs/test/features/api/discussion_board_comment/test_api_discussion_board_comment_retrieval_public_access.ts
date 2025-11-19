import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_comment_retrieval_public_access(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new discussion board member (join)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        nickname: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a new discussion board article as the authenticated member
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);

  // 3. Create a new discussion board comment linked to the article
  const commentCreateBody = {
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 12,
    }),
    discussion_board_article_id: article.id,
    href: "https://example.com/article/detail",
    referrer: "https://example.com/article/list",
  } satisfies IDiscussionBoardComment.ICreate;
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.discussionBoardComments.create(
      connection,
      { body: commentCreateBody },
    );
  typia.assert(comment);

  // 4. Retrieve the comment by its id using the public get endpoint
  const retrievedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.discussionBoardComments.at(
      connection,
      {
        id: comment.id,
      },
    );
  typia.assert(retrievedComment);

  // 5. Validate that the retrieved comment matches the created comment
  TestValidator.equals("comment id matches", retrievedComment.id, comment.id);
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    comment.content,
  );
  TestValidator.equals(
    "comment article id matches",
    retrievedComment.discussion_board_article_id,
    comment.discussion_board_article_id,
  );

  // 6. Validate the author summary
  TestValidator.equals(
    "author id matches",
    retrievedComment.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "author email matches",
    retrievedComment.author.email,
    comment.author.email,
  );
  TestValidator.equals(
    "author nickname matches",
    retrievedComment.author.nickname,
    comment.author.nickname,
  );

  // 7. Validate timestamps (created_at and updated_at)
  TestValidator.predicate(
    "created_at is valid ISO date",
    typeof retrievedComment.created_at === "string" &&
      !Number.isNaN(Date.parse(retrievedComment.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    typeof retrievedComment.updated_at === "string" &&
      !Number.isNaN(Date.parse(retrievedComment.updated_at)),
  );

  // 8. Validate deleted_at: if not deleted, it should be null or undefined
  TestValidator.predicate(
    "deleted_at is null or valid ISO date",
    retrievedComment.deleted_at === null ||
      retrievedComment.deleted_at === undefined ||
      (typeof retrievedComment.deleted_at === "string" &&
        !Number.isNaN(Date.parse(retrievedComment.deleted_at))),
  );
}
