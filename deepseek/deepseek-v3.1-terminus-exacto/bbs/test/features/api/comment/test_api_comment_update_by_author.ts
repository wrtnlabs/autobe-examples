import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Step 3: Create initial comment
  const initialCommentContent = RandomGenerator.paragraph({ sentences: 3 });
  const initialComment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        body: {
          content: initialCommentContent,
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(initialComment);
  // Step 4: Update the comment with new content
  const updatedCommentContent = RandomGenerator.paragraph({ sentences: 4 });
  const updatedComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: updatedCommentContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // Step 5: Validate comment update
  TestValidator.equals(
    "comment id remains the same",
    updatedComment.id,
    initialComment.id,
  );
  TestValidator.equals(
    "comment content is updated",
    updatedComment.content,
    updatedCommentContent,
  );
  TestValidator.notEquals(
    "comment content differs from original",
    updatedComment.content,
    initialCommentContent,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedComment.created_at,
    initialComment.created_at,
  );
  TestValidator.notEquals(
    "updated_at timestamp is refreshed",
    updatedComment.updated_at,
    initialComment.updated_at,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedComment.updated_at) > new Date(updatedComment.created_at),
  );
  // Step 6: Validate author information
  TestValidator.equals(
    "author id remains the same",
    updatedComment.author.id,
    member.id,
  );
  TestValidator.equals(
    "author display name remains the same",
    updatedComment.author.display_name,
    member.display_name,
  );
  // Step 7: Validate article information
  TestValidator.equals(
    "article id remains the same",
    updatedComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title remains the same",
    updatedComment.article.title,
    article.title,
  );
  // Step 8: Validate comment remains active (not deleted)
  TestValidator.equals(
    "comment is not deleted",
    updatedComment.deleted_at,
    null,
  );
  // Step 9: Test meaningful content validation
  TestValidator.predicate(
    "updated content has meaningful length",
    updatedComment.content.length > 10,
  );
  // Step 10: Test that only comment author can update - negative case
  const differentMemberConnection: api.IConnection = { host: connection.host };
  const differentMember = await authorize_member_join(
    differentMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(differentMember);
  // Different member should not be able to update the comment
  await TestValidator.error(
    "different member cannot update comment",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.update(
        differentMemberConnection,
        {
          articleId: article.id,
          commentId: initialComment.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
}
