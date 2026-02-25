import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_comments_create } from "../../../generate/generate_random_discussion_board_registered_user_comments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_discussion_board_registered_user_comment_create_success_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a registered user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(userAuth);
  userConnection.headers = { Authorization: userAuth.token.access };
  // 2. Create an article by the authenticated user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // 3. Primary success path: Create a comment with valid content
  const commentContent = RandomGenerator.paragraph({ sentences: 1 });
  const comment =
    await generate_random_discussion_board_registered_user_comments_create(
      userConnection,
      {
        body: {
          discussionBoardArticleId: article.id,
          content: commentContent,
        },
      },
    );
  typia.assert(comment);
  // Validate comment properties
  TestValidator.equals(
    "comment article id matches",
    comment.article.id,
    article.id,
  );
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment author id matches",
    comment.author.id,
    userAuth.id,
  );
  TestValidator.predicate(
    "comment has valid id",
    typeof comment.id === "string" && comment.id.length > 0,
  );
  TestValidator.predicate(
    "comment createdAt is ISO date",
    typeof comment.createdAt === "string" && comment.createdAt.length > 0,
  );
  TestValidator.predicate(
    "comment updatedAt is ISO date",
    typeof comment.updatedAt === "string" && comment.updatedAt.length > 0,
  );
  TestValidator.equals("comment deletedAt is null", comment.deletedAt, null);
  // 4. Edge case: Comment with leading and trailing whitespace
  const rawContentWithWhitespace = `  ${RandomGenerator.paragraph({ sentences: 1 })}  `;
  const trimmedContent = rawContentWithWhitespace.trim();
  const commentWithWhitespace =
    await generate_random_discussion_board_registered_user_comments_create(
      userConnection,
      {
        body: {
          discussionBoardArticleId: article.id,
          content: rawContentWithWhitespace,
        },
      },
    );
  typia.assert(commentWithWhitespace);
  TestValidator.equals(
    "trimmed comment content stored",
    commentWithWhitespace.content,
    trimmedContent,
  );
  TestValidator.equals(
    "comment author id matches",
    commentWithWhitespace.author.id,
    userAuth.id,
  );
  TestValidator.predicate(
    "comment createdAt is ISO date",
    typeof commentWithWhitespace.createdAt === "string" &&
      commentWithWhitespace.createdAt.length > 0,
  );
  TestValidator.predicate(
    "comment updatedAt is ISO date",
    typeof commentWithWhitespace.updatedAt === "string" &&
      commentWithWhitespace.updatedAt.length > 0,
  );
  TestValidator.equals(
    "comment deletedAt is null",
    commentWithWhitespace.deletedAt,
    null,
  );
  // 5. Edge case: Comment with minimum valid content (single character)
  const singleCharContent = RandomGenerator.alphabets(1);
  const commentSingleChar =
    await generate_random_discussion_board_registered_user_comments_create(
      userConnection,
      {
        body: {
          discussionBoardArticleId: article.id,
          content: singleCharContent,
        },
      },
    );
  typia.assert(commentSingleChar);
  TestValidator.equals(
    "single char comment content matches",
    commentSingleChar.content,
    singleCharContent,
  );
  TestValidator.equals(
    "comment author id matches",
    commentSingleChar.author.id,
    userAuth.id,
  );
  TestValidator.predicate(
    "comment createdAt is ISO date",
    typeof commentSingleChar.createdAt === "string" &&
      commentSingleChar.createdAt.length > 0,
  );
  TestValidator.predicate(
    "comment updatedAt is ISO date",
    typeof commentSingleChar.updatedAt === "string" &&
      commentSingleChar.updatedAt.length > 0,
  );
  TestValidator.equals(
    "comment deletedAt is null",
    commentSingleChar.deletedAt,
    null,
  );
  // 6. Retrieve all comments for the article and verify ascending order by createdAt
  // Since no explicit listing endpoint was provided in the scenario, we skip retrieval.
  // In real tests, we would call an API to fetch comments and assert order.
}
