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
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_comments_flags_create } from "../../../generate/generate_random_discussion_board_user_comments_flags_create";
import { generate_random_discussion_board_user_comments_reports_create } from "../../../generate/generate_random_discussion_board_user_comments_reports_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_flag } from "../../../prepare/prepare_random_discussion_board_comment_flag";
import { prepare_random_discussion_board_comment_report } from "../../../prepare/prepare_random_discussion_board_comment_report";

export async function test_api_admin_comment_moderation_dashboard_escalating_workload(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
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
  // Create multiple users for content generation
  const users = await ArrayUtil.asyncRepeat(3, async () => {
    const userConnection: api.IConnection = { host: connection.host };
    return await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user123",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    });
  });
  // Create articles as content containers
  const articles = await ArrayUtil.asyncRepeat(2, async () => {
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_login(userConnection, {
      body: {
        email: users[0].email,
        password: "user123",
      } satisfies IDiscussionBoardUser.ILogin,
    });
    return await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  });
  // Generate multiple comments to create moderation workload
  const comments = [];
  for (const user of users) {
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_login(userConnection, {
      body: {
        email: user.email,
        password: "user123",
      } satisfies IDiscussionBoardUser.ILogin,
    });
    for (const article of articles) {
      const commentCount = typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
      >();
      const userComments = await ArrayUtil.asyncRepeat(
        commentCount,
        async () => {
          return await generate_random_discussion_board_user_articles_comments_create(
            userConnection,
            {
              body: {
                content: RandomGenerator.paragraph({ sentences: 3 }),
              } satisfies IDiscussionBoardComment.ICreate,
              params: {
                articleId: article.id,
              },
            },
          );
        },
      );
      comments.push(...userComments);
    }
  }
  // Create pending flags to simulate community concern
  const flags = [];
  for (const comment of comments.slice(0, Math.floor(comments.length * 0.6))) {
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_login(userConnection, {
      body: {
        email: users[1].email,
        password: "user123",
      } satisfies IDiscussionBoardUser.ILogin,
    });
    const flag =
      await generate_random_discussion_board_user_comments_flags_create(
        userConnection,
        {
          body: {
            flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
            flag_type: RandomGenerator.pick([
              "spam",
              "harassment",
              "inappropriate",
            ] as const),
            resolution_notes: null,
          } satisfies IDiscussionBoardCommentFlag.ICreate,
          params: {
            commentId: comment.id,
          },
        },
      );
    flags.push(flag);
  }
  // Create pending reports requiring administrator review
  const reports = [];
  for (const comment of comments.slice(
    Math.floor(comments.length * 0.4),
    Math.floor(comments.length * 0.8),
  )) {
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_login(userConnection, {
      body: {
        email: users[2].email,
        password: "user123",
      } satisfies IDiscussionBoardUser.ILogin,
    });
    const report =
      await generate_random_discussion_board_user_comments_reports_create(
        userConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardCommentReport.ICreate,
          params: {
            commentId: comment.id,
          },
        },
      );
    reports.push(report);
  }
  // Access dashboard to assess workload
  const dashboard =
    await api.functional.discussionBoard.admin.comments.moderation.dashboard.at(
      adminConnection,
    );
  typia.assert(dashboard);
  // Validate dashboard provides actionable insights
  TestValidator.predicate(
    "dashboard contains moderation data",
    dashboard.id !== undefined && dashboard.action_type !== undefined,
  );
  // Verify dashboard structure
  TestValidator.equals(
    "dashboard has comment reference",
    typeof dashboard.comment,
    "object",
  );
  TestValidator.equals(
    "dashboard has admin reference",
    typeof dashboard.admin,
    "object",
  );
  TestValidator.predicate(
    "dashboard has valid timestamps",
    dashboard.created_at !== undefined && dashboard.updated_at !== undefined,
  );
}
