import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test comment retrieval by administrator for content moderation.
 *
 * This test verifies that administrators can retrieve any comment on the
 * discussion board regardless of who authored it, enabling content moderation
 * and platform oversight capabilities.
 *
 * Flow:
 * 1. Register and authenticate as a member
 * 2. Register and authenticate as an administrator
 * 3. Create a section as administrator
 * 4. Create an article as the member
 * 5. Create a comment on the article as the member
 * 6. Retrieve the comment using administrator credentials
 * 7. Validate the comment details and authorization
 */
export async function test_api_comment_retrieve_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Create a section as administrator
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(section);
  // 4. Create an article as the member
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: section.id,
        tags: ["test", "discussion"],
      },
    },
  );
  typia.assert(article);
  // 5. Create a comment on the article as the member
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // 6. Retrieve the comment using administrator credentials
  const retrievedComment =
    await api.functional.discussionBoard.articles.comments.at(adminConnection, {
      articleId: article.id,
      commentId: comment.id,
    });
  typia.assert(retrievedComment);
  // 7. Validate the comment details
  TestValidator.equals("comment id matches", retrievedComment.id, comment.id);
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    comment.content,
  );
  TestValidator.equals(
    "author is the member",
    retrievedComment.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "article id matches",
    retrievedComment.article.id,
    article.id,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedComment.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedComment.updated_at !== null,
  );
  TestValidator.equals(
    "comment is not deleted",
    retrievedComment.deleted_at,
    null,
  );
}
