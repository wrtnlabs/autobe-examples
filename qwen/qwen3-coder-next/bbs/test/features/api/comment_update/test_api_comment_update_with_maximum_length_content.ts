import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_comments_create } from "../../../generate/generate_random_discussion_board_member_comments_create";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_comment } from "../../../prepare/prepare_random_discussion_board_article_comment";

export async function test_api_comment_update_with_maximum_length_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Create an article first (to have a valid articleId for comments)
  // Since we don't have section creation endpoint, we'll use a valid UUID for sectionId
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const articleResponse =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: sectionId,
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(articleResponse);
  
  // Extract article data using typia.assert and access fields properly
  const article = typia.assert<{ id: string }>(articleResponse);
  
  // 3. Create an initial comment on the article
  const commentResponse = await api.functional.discussionBoard.member.comments.create(
    memberConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardArticleComment.ICreate,
    },
  );
  typia.assert(commentResponse);
  
  // Extract comment data using typia.assert and access fields properly
  const comment = typia.assert<{ id: string; content: string }>(commentResponse);
  
  // 4. Update the comment with maximum length content (500 characters)
  // Generate exactly 500 characters
  const maxContent = RandomGenerator.alphabets(490) + "!";
  const updatedCommentResponse =
    await api.functional.discussionBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: maxContent,
        } satisfies IDiscussionBoardArticleComment.IUpdate,
      },
    );
  typia.assert(updatedCommentResponse);
  
  // Extract updated comment data using typia.assert and access fields properly
  const updatedComment = typia.assert<{ id: string; content: string }>(updatedCommentResponse);
  
  // 5. Verify the update was successful
  TestValidator.equals("comment ID matches", updatedComment.id, comment.id);
  TestValidator.equals(
    "comment content matches maximum length",
    updatedComment.content,
    maxContent,
  );
}