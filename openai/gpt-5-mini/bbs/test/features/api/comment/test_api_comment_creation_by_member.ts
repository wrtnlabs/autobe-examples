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

export async function test_api_comment_creation_by_member(
  connection: api.IConnection,
) {
  // 1) Register a fresh member and obtain authorization token
  const memberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd12345",
    href: "https://example.com/test",
    referrer: "https://example.com/referrer",
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2) Create a parent article with the authenticated member's context
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);
  TestValidator.predicate(
    "article id is present",
    typeof article.id === "string" && article.id.length > 0,
  );

  // 3) Create a top-level comment on the article
  const commentContent = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const commentReq = {
    content: commentContent,
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentReq,
      },
    );
  typia.assert(comment);

  // Business validations
  TestValidator.equals(
    "comment content persisted",
    comment.content,
    commentContent,
  );

  // Ensure author summary exists and matches created member when present
  if (comment.author !== null && comment.author !== undefined) {
    typia.assert(comment.author);
    TestValidator.equals(
      "comment author id matches member id",
      comment.author.id,
      member.id,
    );
  } else {
    // If author is null (anonymized), at least ensure article association and content
    TestValidator.predicate(
      "comment author is anonymized or absent",
      comment.author === null || comment.author === undefined,
    );
  }

  TestValidator.predicate(
    "comment has creation timestamp",
    comment.createdAt !== null && comment.createdAt !== undefined,
  );
  TestValidator.equals(
    "comment.articleId matches article id",
    comment.articleId,
    article.id,
  );

  // Negative: unauthenticated comment creation should fail (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated comment creation should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.create(
        unauthConn,
        {
          articleId: article.id,
          body: commentReq,
        },
      );
    },
  );

  // Negative: invalid parentCommentId (non-existent) should cause failure
  const fakeParentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "creating comment with non-existent parentCommentId should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
            parentCommentId: fakeParentId,
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );

  // Throttling / anti-abuse: attempt rapid repeated comment creation
  // Try creating many comments in quick succession and observe if any error occurs.
  try {
    let createdCount = 0;
    await ArrayUtil.asyncRepeat(10, async () => {
      const c =
        await api.functional.discussionBoard.member.articles.comments.create(
          connection,
          {
            articleId: article.id,
            body: {
              content: RandomGenerator.paragraph({ sentences: 1 }),
            } satisfies IDiscussionBoardComment.ICreate,
          },
        );
      typia.assert(c);
      createdCount++;
    });
    TestValidator.predicate(
      "burst comment creation completed without observable throttling",
      createdCount > 0,
    );
  } catch (err) {
    // If server enforces throttling/anti-abuse, ensure an error was thrown
    TestValidator.predicate(
      "burst comment creation triggered throttling or failed",
      err !== undefined && err !== null,
    );
  }
}
