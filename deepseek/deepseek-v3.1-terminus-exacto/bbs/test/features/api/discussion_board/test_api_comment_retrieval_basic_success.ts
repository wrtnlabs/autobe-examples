import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test the basic success scenario of retrieving a specific comment from an article.
 * Create an article with a comment, then retrieve the comment using the GET endpoint.
 * Validate that the response contains the complete comment entity with all fields
 * including content, timestamps, author information, and article context.
 * Verify that the comment belongs to the correct article and that the author
 * information matches the user who created the comment.
 */
export async function test_api_comment_retrieval_basic_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // 2. Create a section for the article
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(section);
  // 3. User setup - create user account and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardUser.IJoin;
  const userAuth = await authorize_user_join(userConnection, {
    body: userCredentials,
  });
  typia.assert(userAuth);
  // 4. Create an article in the section
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        section_id: section.id,
        status: "published" as const,
      },
    },
  );
  typia.assert(article);
  // 5. Create a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Create a fresh connection for comment retrieval to test the endpoint independently
  const retrievalConnection: api.IConnection = { host: connection.host };
  // 7. Retrieve the comment using the GET endpoint
  const retrievedComment =
    await api.functional.discussionBoard.articles.comments.at(
      retrievalConnection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedComment);
  // 8. Validate that the response contains the complete comment entity
  TestValidator.equals("comment ID matches", retrievedComment.id, comment.id);
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    comment.content,
  );
  TestValidator.predicate(
    "comment has creation timestamp",
    retrievedComment.created_at !== null,
  );
  TestValidator.predicate(
    "comment has update timestamp",
    retrievedComment.updated_at !== null,
  );
  TestValidator.equals(
    "comment deleted_at is null",
    retrievedComment.deleted_at,
    null,
  );
  // 9. Verify author information matches
  TestValidator.equals(
    "author ID matches",
    retrievedComment.author.id,
    userAuth.id,
  );
  TestValidator.equals(
    "author display name matches",
    retrievedComment.author.display_name,
    userAuth.display_name,
  );
  TestValidator.equals(
    "author bio matches",
    retrievedComment.author.bio,
    userAuth.bio,
  );
  // 10. Verify article context matches
  TestValidator.equals(
    "article ID matches",
    retrievedComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title matches",
    retrievedComment.article.title,
    article.title,
  );
  TestValidator.equals(
    "article status matches",
    retrievedComment.article.status,
    article.status,
  );
  TestValidator.equals(
    "section ID matches",
    retrievedComment.article.section.id,
    section.id,
  );
  TestValidator.equals(
    "section name matches",
    retrievedComment.article.section.name,
    section.name,
  );
}