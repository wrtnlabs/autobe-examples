import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import type { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
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
import { generate_random_discussion_board_admin_comments_moderations_create } from "../../../generate/generate_random_discussion_board_admin_comments_moderations_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_comments_flags_create } from "../../../generate/generate_random_discussion_board_user_comments_flags_create";
import { generate_random_discussion_board_user_comments_reports_create } from "../../../generate/generate_random_discussion_board_user_comments_reports_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_flag } from "../../../prepare/prepare_random_discussion_board_comment_flag";
import { prepare_random_discussion_board_comment_moderation } from "../../../prepare/prepare_random_discussion_board_comment_moderation";
import { prepare_random_discussion_board_comment_report } from "../../../prepare/prepare_random_discussion_board_comment_report";

export async function test_api_admin_comment_moderation_dashboard_comprehensive_activity(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create multiple users
  const users: IDiscussionBoardUser.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user123",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    users.push(user);
  }
  // Create articles for each user
  const articles: IDiscussionBoardArticle[] = [];
  for (const user of users) {
    const userConnection: api.IConnection = {
      host: connection.host,
      headers: { Authorization: user.token.access },
    };
    const article = await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
    typia.assert(article);
    articles.push(article);
  }
  // Create comments on articles
  const comments: IDiscussionBoardComment[] = [];
  for (const [index, user] of users.entries()) {
    const userConnection: api.IConnection = {
      host: connection.host,
      headers: { Authorization: user.token.access },
    };
    const comment =
      await generate_random_discussion_board_user_articles_comments_create(
        userConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          },
          params: {
            articleId: articles[index].id,
          },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // Create flags on comments
  const flags: IDiscussionBoardCommentFlag[] = [];
  for (const [index, user] of users.entries()) {
    const userConnection: api.IConnection = {
      host: connection.host,
      headers: { Authorization: user.token.access },
    };
    const flag =
      await generate_random_discussion_board_user_comments_flags_create(
        userConnection,
        {
          body: {
            flag_reason: RandomGenerator.paragraph({ sentences: 1 }),
            flag_type: "inappropriate",
            resolution_notes: null,
          },
          params: {
            commentId: comments[index].id,
          },
        },
      );
    typia.assert(flag);
    flags.push(flag);
  }
  // Create reports on comments
  const reports: IDiscussionBoardCommentReport[] = [];
  for (const [index, user] of users.entries()) {
    const userConnection: api.IConnection = {
      host: connection.host,
      headers: { Authorization: user.token.access },
    };
    const report =
      await generate_random_discussion_board_user_comments_reports_create(
        userConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 1 }),
          },
          params: {
            commentId: comments[index].id,
          },
        },
      );
    typia.assert(report);
    reports.push(report);
  }
  // Perform moderation actions
  const moderations: IDiscussionBoardCommentModeration[] = [];
  for (const comment of comments) {
    const moderation =
      await generate_random_discussion_board_admin_comments_moderations_create(
        adminConnection,
        {
          body: {
            action_type: "review",
            reason: RandomGenerator.paragraph({ sentences: 1 }),
            status: "completed",
            discussion_board_comment_id: comment.id,
          },
          params: {
            commentId: comment.id,
          },
        },
      );
    typia.assert(moderation);
    moderations.push(moderation);
  }
  // Access the dashboard
  const dashboard =
    await api.functional.discussionBoard.admin.comments.moderation.dashboard.at(
      adminConnection,
    );
  typia.assert(dashboard);
  // Validate dashboard data reflects the created moderation activities
  TestValidator.predicate(
    "dashboard should contain valid moderation record",
    dashboard.id !== undefined,
  );
  TestValidator.predicate(
    "dashboard should have action type",
    dashboard.action_type !== undefined,
  );
  TestValidator.predicate(
    "dashboard should have reason",
    dashboard.reason !== undefined,
  );
  TestValidator.predicate(
    "dashboard should have status",
    dashboard.status !== undefined,
  );
}
