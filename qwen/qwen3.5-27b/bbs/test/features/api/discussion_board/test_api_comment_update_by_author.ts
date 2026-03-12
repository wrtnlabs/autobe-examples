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
 * Test that a member can successfully update the content of their own comment on an article.
 *
 * Setup:
 * 1. Register and authenticate as administrator
 * 2. Create a section for article organization
 * 3. Register and authenticate as a member
 * 4. Create an article in that section as the member
 * 5. Create a comment on the article as the same member
 *
 * Execution:
 * 1. Call PUT /discussionBoard/member/articles/{articleId}/comments/{commentId} with updated content
 * 2. Verify the response returns the updated comment with updated content and preserved relationships
 *
 * Validation:
 * - Updated content matches the request body
 * - Author and article relationships are preserved
 * - Timestamps show the update occurred
 */
export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 2. Member setup - create article and comment
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
      },
    },
  );
  typia.assert(article);
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // 3. Update the comment
  const updatedContent = RandomGenerator.paragraph({ sentences: 3 });
  const updatedComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: updatedContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 4. Validate the update
  TestValidator.equals(
    "content updated",
    updatedComment.content,
    updatedContent,
  );
  TestValidator.equals("comment id preserved", updatedComment.id, comment.id);
  TestValidator.equals(
    "author preserved",
    updatedComment.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "article preserved",
    updatedComment.article.id,
    article.id,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedComment.updated_at).getTime() >=
      new Date(updatedComment.created_at).getTime(),
  );
  TestValidator.equals("comment is active", updatedComment.deleted_at, null);
}
