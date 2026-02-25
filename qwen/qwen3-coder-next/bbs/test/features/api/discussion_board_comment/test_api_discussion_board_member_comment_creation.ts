import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_discussion_board_member_comment_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connections
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Register and login member to get JWT token
  const joinResponse = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        passwordConfirmation: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(joinResponse);
  // The join function updates the connection's headers internally
  // Create a new connection with the updated headers for subsequent calls
  const authenticatedMemberConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedMemberConnection.headers = {
    ...memberConnection.headers,
  };
  // 3. Create an article to comment on
  const article = await api.functional.discussionBoard.member.articles.create(
    authenticatedMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: "00000000-0000-0000-0000-000000000000" satisfies string &
          tags.Format<"uuid">,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Create a comment on the article
  const commentContent = RandomGenerator.paragraph({ sentences: 2 });
  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      authenticatedMemberConnection,
      {
        articleId: article.id,
        body: {
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Validate comment properties
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentContent,
  );
  TestValidator.equals("article_id matches", comment.article_id, article.id);
  TestValidator.equals(
    "author id matches",
    comment.author.id,
    joinResponse.member.id,
  );
  TestValidator.equals(
    "author email matches",
    comment.author.email,
    joinResponse.member.email,
  );
  TestValidator.equals(
    "author display_name matches",
    comment.author.display_name,
    joinResponse.member.display_name,
  );
  TestValidator.predicate(
    "author is_active is boolean",
    typeof comment.author.is_active === "boolean",
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof comment.created_at === "string" &&
      !isNaN(Date.parse(comment.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof comment.updated_at === "string" &&
      !isNaN(Date.parse(comment.updated_at)),
  );
  TestValidator.equals("deleted_at is null", comment.deleted_at, null);
}