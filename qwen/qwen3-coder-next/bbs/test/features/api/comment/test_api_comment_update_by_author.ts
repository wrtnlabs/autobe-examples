import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin registration and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // 2. Member registration and login (comment author)
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.member.join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // 3. Super admin creates article for comment
  const article = await api.functional.discussionBoard.member.articles.create(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardArticle.ICreate>(),
    },
  );
  typia.assert(article);
  // 4. Member creates comment on article
  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: article.id,
        body: typia.random<IDiscussionBoardComment.ICreate>(),
      },
    );
  typia.assert(comment);
  // 5. Member updates their own comment
  const newContent = RandomGenerator.paragraph({ sentences: 2 });
  const updatedComment =
    await api.functional.discussionBoard.superAdmin.comments.update(
      memberConnection,
      {
        commentId: comment.id,
        body: { content: newContent } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 6. Validate update
  TestValidator.equals("content updated", updatedComment.content, newContent);
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedComment.updated_at,
    comment.updated_at,
  );
  TestValidator.equals(
    "author preserved",
    updatedComment.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "article_id preserved",
    updatedComment.article_id,
    article.id,
  );
}
