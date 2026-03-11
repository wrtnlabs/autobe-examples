import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentActivityMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentActivityMetadatum";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentActivityMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentActivityMetadatum";
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

export async function test_api_comment_audit_metadata_hierarchical_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create member connection and content
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
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
  // 3. Create article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Create comment
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Test invalid hierarchy - mismatched article-comment
  await TestValidator.error("mismatched article-comment pair", async () => {
    await api.functional.discussionBoard.admin.articles.comments.activities.metadata.index(
      adminConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        commentId: comment.id,
        activityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          key: RandomGenerator.alphabets(10),
          value: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCommentActivityMetadatum.IRequest,
      },
    );
  });
  // 6. Test invalid hierarchy - non-existent activity
  await TestValidator.error("non-existent activity ID", async () => {
    await api.functional.discussionBoard.admin.articles.comments.activities.metadata.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        activityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          key: RandomGenerator.alphabets(10),
          value: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCommentActivityMetadatum.IRequest,
      },
    );
  });
  // 7. Test invalid hierarchy - mismatched comment-activity
  await TestValidator.error("activity not belonging to comment", async () => {
    await api.functional.discussionBoard.admin.articles.comments.activities.metadata.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: typia.random<string & tags.Format<"uuid">>(),
        activityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          key: RandomGenerator.alphabets(10),
          value: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCommentActivityMetadatum.IRequest,
      },
    );
  });
  // 8. Test pagination with invalid hierarchy (should still fail)
  await TestValidator.error("pagination with invalid hierarchy", async () => {
    await api.functional.discussionBoard.admin.articles.comments.activities.metadata.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        activityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          key: "old_content",
          value: "test",
          created_after: new Date(Date.now() - 86400000).toISOString(),
          created_before: new Date().toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentActivityMetadatum.IRequest,
      },
    );
  });
}
