import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentActivity";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentActivity";
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

export async function test_api_comment_activity_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "member1234",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://test.com",
      referrer: "https://referrer.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Create test article
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
  // Create test comment
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: { articleId: article.id },
      },
    );
  typia.assert(comment);
  // Generate edit activity
  const updatedComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // Generate deletion activity
  await api.functional.discussionBoard.member.articles.comments.erase(
    memberConnection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );
  // Test filtering by action type 'edit'
  const editActivities =
    await api.functional.discussionBoard.admin.articles.comments.activities.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          action: "edit",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentActivity.IRequest,
      },
    );
  typia.assert(editActivities);
  // Validate edit activities contain only edit actions
  TestValidator.predicate(
    "edit activities should contain only edit actions",
    editActivities.data.every((activity) => activity.action === "edit"),
  );
  // Test filtering by action type 'delete'
  const deleteActivities =
    await api.functional.discussionBoard.admin.articles.comments.activities.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          action: "delete",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentActivity.IRequest,
      },
    );
  typia.assert(deleteActivities);
  // Validate delete activities contain only delete actions
  TestValidator.predicate(
    "delete activities should contain only delete actions",
    deleteActivities.data.every((activity) => activity.action === "delete"),
  );
  // Test combined filters (action type + date range)
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const endDate = new Date().toISOString();
  const filteredActivities =
    await api.functional.discussionBoard.admin.articles.comments.activities.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          action: "edit",
          start_date: startDate,
          end_date: endDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentActivity.IRequest,
      },
    );
  typia.assert(filteredActivities);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid structure",
    filteredActivities.pagination.current > 0 &&
      filteredActivities.pagination.limit > 0 &&
      filteredActivities.pagination.records >= 0 &&
      filteredActivities.pagination.pages >= 0,
  );
  // Test that different action types return different results
  TestValidator.notEquals(
    "edit and delete activities should be different",
    editActivities.data.length,
    deleteActivities.data.length,
  );
}
