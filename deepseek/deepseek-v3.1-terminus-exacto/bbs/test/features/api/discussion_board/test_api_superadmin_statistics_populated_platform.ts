import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test the statistics endpoint with a fully populated platform containing multiple users,
 * articles, comments, sections, and engagement metrics.
 */
export async function test_api_superadmin_statistics_populated_platform(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create multiple sections
  const sections: IDiscussionBoardSection[] = [];
  for (let i = 0; i < 3; i++) {
    const section =
      await generate_random_discussion_board_super_admin_sections_create(
        superAdminConnection,
        {
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            display_order: i + 1,
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    typia.assert(section);
    sections.push(section);
  }
  // Create multiple users with their credentials stored
  const userCredentials: Array<{
    email: string;
    password: string;
    connection: api.IConnection;
  }> = [];
  for (let i = 0; i < 5; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    const password = RandomGenerator.alphaNumeric(16);
    const user = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: password,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    typia.assert(user);
    userCredentials.push({
      email: user.email,
      password: password,
      connection: userConnection,
    });
  }
  // Create articles and comments in a structured way
  const articles: IDiscussionBoardArticle[] = [];
  const comments: IDiscussionBoardComment[] = [];
  // Each user creates articles
  for (const userCred of userCredentials) {
    for (let j = 0; j < 2; j++) {
      const article =
        await generate_random_discussion_board_user_articles_create(
          userCred.connection,
          {
            body: {
              title: RandomGenerator.paragraph({ sentences: 1 }),
              content: RandomGenerator.content({ paragraphs: 2 }),
              section_id: RandomGenerator.pick(sections).id,
              status: "published" as const,
            } satisfies IDiscussionBoardArticle.ICreate,
          },
        );
      typia.assert(article);
      articles.push(article);
      // Other users comment on this article
      for (let k = 0; k < 3; k++) {
        const commentUserCred =
          userCredentials[
            (userCredentials.indexOf(userCred) + k + 1) % userCredentials.length
          ];
        const comment =
          await generate_random_discussion_board_user_articles_comments_create(
            commentUserCred.connection,
            {
              body: {
                content: RandomGenerator.paragraph({ sentences: 1 }),
              } satisfies IDiscussionBoardComment.ICreate,
              params: {
                articleId: article.id,
              },
            },
          );
        typia.assert(comment);
        comments.push(comment);
      }
    }
  }
  // Test the statistics endpoint
  const statistics =
    await api.functional.discussionBoard.superAdmin.statistics.at(
      superAdminConnection,
    );
  typia.assert(statistics);
  // Validate statistics metrics
  TestValidator.predicate(
    "statistics should contain valid metrics",
    statistics.metric_type.length > 0 && statistics.metric_value >= 0,
  );
  TestValidator.predicate(
    "statistics should have valid collection timestamp",
    new Date(statistics.collection_timestamp).getTime() > 0,
  );
  TestValidator.predicate(
    "statistics should have valid unit",
    statistics.metric_unit.length > 0,
  );
}
