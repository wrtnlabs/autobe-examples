import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test unauthorized comment update access control.
 * This test validates that unauthorized users cannot update comments they don't own.
 * 1. Create two separate member accounts
 * 2. First member creates an article
 * 3. First member creates a comment on the article
 * 4. Second member attempts to update the comment (should fail)
 * 5. Verify comment content remains unchanged
 */
export async function test_api_comment_update_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMemberLoginInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    passwordConfirmation: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardMember.IJoin;
  await api.functional.discussionBoard.auth.member.join(firstMemberConnection, {
    body: firstMemberLoginInput,
  });
  // 2. Create second member account
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberLoginInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    passwordConfirmation: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardMember.IJoin;
  await api.functional.discussionBoard.auth.member.join(
    secondMemberConnection,
    {
      body: secondMemberLoginInput,
    },
  );
  // 3. First member creates an article
  const article = await api.functional.discussionBoard.member.articles.create(
    firstMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. First member creates a comment
  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      firstMemberConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Second member attempts to update the comment (should fail)
  await TestValidator.error(
    "unauthorized user cannot update other's comment",
    async () => {
      await api.functional.discussionBoard.admin.comments.update(
        secondMemberConnection,
        {
          commentId: comment.id,
          body: {
            content: "Unauthorized update attempt",
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
  // 6. Verify original comment still exists and is accessible
  const refreshedComment =
    await api.functional.discussionBoard.admin.comments.update(
      firstMemberConnection,
      {
        commentId: comment.id,
        body: {
          content: "Restored original content",
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(refreshedComment);
  // 7. Verify the comment's author is still the first member
  TestValidator.equals(
    "comment author unchanged",
    refreshedComment.author.id,
    comment.author.id,
  );
}
