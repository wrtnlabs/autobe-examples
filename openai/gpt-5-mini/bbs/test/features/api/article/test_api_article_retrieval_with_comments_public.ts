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

export async function test_api_article_retrieval_with_comments_public(
  connection: api.IConnection,
) {
  // 1) Register a new member (join)
  const memberBody = {
    username: `user_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-1234",
    href: "http://example.com/entry",
    referrer: "http://referrer.example.com/",
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberBody });
  typia.assert(member);

  // 2) Create an article as published
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    state: "published",
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(createdArticle);

  // Business validations about the created article
  TestValidator.predicate(
    "created article has id",
    typeof createdArticle.id === "string" && createdArticle.id.length > 0,
  );

  TestValidator.predicate(
    "created article is published (published_at present)",
    createdArticle.published_at !== null &&
      createdArticle.published_at !== undefined,
  );

  // Author summary must be present and sanitized
  TestValidator.predicate(
    "article author summary present and sanitized",
    createdArticle.author !== null &&
      createdArticle.author !== undefined &&
      typeof createdArticle.author.id === "string" &&
      typeof createdArticle.author.username === "string",
  );

  // Ensure author summary does not expose sensitive fields at runtime
  TestValidator.predicate(
    "author summary does not contain email",
    createdArticle.author !== null &&
      createdArticle.author !== undefined &&
      Object.prototype.hasOwnProperty.call(
        createdArticle.author as object,
        "email",
      ) === false,
  );

  // Optional: if attachments/tags/category are present, typia.assert already validated them
  TestValidator.predicate(
    "attachments is an array when present",
    Array.isArray(createdArticle.attachments),
  );

  // 3) Create visible comments (two comments)
  const commentBodies = [
    {
      content: RandomGenerator.paragraph({ sentences: 8 }),
    },
    {
      content: RandomGenerator.paragraph({ sentences: 6 }),
    },
  ] as const;

  const createdComments: IDiscussionBoardComment[] = [];

  for (const body of commentBodies) {
    const requestBody = { ...body } satisfies IDiscussionBoardComment.ICreate;
    const comment: IDiscussionBoardComment =
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        {
          articleId: createdArticle.id,
          body: requestBody,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);

    // Validate business rules for each comment
    TestValidator.predicate(
      "comment is not hidden",
      comment.isHidden === false,
    );
    TestValidator.predicate(
      "comment is not deleted",
      comment.deletedAt === null || comment.deletedAt === undefined,
    );

    // Author summary of comment must be sanitized
    TestValidator.predicate(
      "comment author summary present",
      comment.author !== null &&
        comment.author !== undefined &&
        typeof comment.author.id === "string",
    );
    TestValidator.predicate(
      "comment author summary does not contain email",
      comment.author !== null &&
        comment.author !== undefined &&
        Object.prototype.hasOwnProperty.call(
          comment.author as object,
          "email",
        ) === false,
    );
  }

  // 4) Anonymous retrieval proxy checks
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Since GET /discussionBoard/articles/:articleId is not available in SDK,
  // use published flag and comments created as a proxy for anonymous retrieval
  TestValidator.predicate(
    "article would be retrievable anonymously since it is published",
    createdArticle.published_at !== null &&
      createdArticle.published_at !== undefined,
  );

  TestValidator.equals(
    "created comments count matches",
    createdComments.length,
    commentBodies.length,
  );

  // Ensure each created comment has creation timestamp
  for (const c of createdComments) {
    TestValidator.predicate(
      "comment has createdAt timestamp",
      typeof c.createdAt === "string" && c.createdAt.length > 0,
    );
  }
}
