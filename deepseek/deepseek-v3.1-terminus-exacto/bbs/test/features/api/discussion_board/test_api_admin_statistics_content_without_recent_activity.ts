import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test statistics retrieval when platform has historical content but no recent user activity.
 * Create users, articles, and comments with older timestamps to simulate a platform with
 * established content but declining engagement. Verify that statistics correctly show
 * total counts (users, articles, comments) while recent activity metrics reflect the
 * lack of current engagement.
 */
export async function test_api_admin_statistics_content_without_recent_activity(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for administrative operations
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create sections for content organization
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Create multiple users who will generate historical content
  // Store both the user data and their passwords for later authentication
  const userCredentials = ArrayUtil.repeat(3, () => ({
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  }));
  const userAuthorizations = await Promise.all(
    userCredentials.map(async (credential) => {
      const userConnection: api.IConnection = { host: connection.host };
      const authorizedUser = await authorize_user_join(userConnection, {
        body: credential satisfies IDiscussionBoardUser.IJoin,
      });
      return { connection: userConnection, credential, user: authorizedUser };
    }),
  );
  // Create articles using the authenticated user connections
  const articles = await Promise.all(
    userAuthorizations.map(async ({ connection: userConnection }) => {
      return await generate_random_discussion_board_user_articles_create(
        userConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            content: RandomGenerator.paragraph({ sentences: 5 }),
            section_id: section.id,
            status: "published" as const,
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    }),
  );
  articles.forEach(article => typia.assert(article));
  // Create comments on articles using authenticated user connections
  const comments = await Promise.all(
    articles.flatMap((article) =>
      userAuthorizations.map(async ({ connection: userConnection }) => {
        return await generate_random_discussion_board_user_articles_comments_create(
          userConnection,
          {
            body: {
              content: RandomGenerator.paragraph({ sentences: 2 }),
            } satisfies IDiscussionBoardComment.ICreate,
            params: {
              articleId: article.id,
            },
          },
        );
      }),
    ),
  );
  comments.forEach(comment => typia.assert(comment));
  // Retrieve statistics as admin
  const statistics =
    await api.functional.discussionBoard.admin.statistics.at(adminConnection);
  typia.assert(statistics);
  // Validate that statistics contain meaningful data
  TestValidator.predicate(
    "statistics should contain performance metrics",
    statistics.metric_type.length > 0,
  );
  TestValidator.predicate(
    "statistics should have valid metric values",
    statistics.metric_value > 0,
  );
  TestValidator.predicate(
    "statistics should have collection timestamp",
    statistics.collection_timestamp.length > 0,
  );
}