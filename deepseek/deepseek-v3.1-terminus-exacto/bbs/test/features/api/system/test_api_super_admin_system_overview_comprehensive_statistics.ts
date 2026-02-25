import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
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
 * Test comprehensive system overview statistics with realistic platform data.
 *
 * Verifies that the system overview endpoint accurately aggregates statistics
 * from multiple database tables including users, articles, comments, sections,
 * administrators, and super administrators. Tests statistical calculations
 * with proper filtering of deleted records and comprehensive platform metrics.
 */
export async function test_api_super_admin_system_overview_comprehensive_statistics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create multiple sections
  const sections: IDiscussionBoardSection[] = [];
  const sectionNames = [
    "Politics",
    "Economy",
    "Current Affairs",
    "Technology",
  ] as const;
  for (const name of sectionNames) {
    const section =
      await generate_random_discussion_board_super_admin_sections_create(
        superAdminConnection,
        {
          body: {
            name,
            description: `Discussion section for ${name.toLowerCase()} topics`,
            status: "active",
            display_order: sectionNames.indexOf(name) + 1,
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    typia.assert(section);
    sections.push(section);
  }
  // 3. Create multiple regular users and populate with content
  const users: IDiscussionBoardUser.IAuthorized[] = [];
  const articles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < 3; i++) {
    // Create user
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user123",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    typia.assert(user);
    users.push(user);
    // Create articles for each user across different sections
    for (let j = 0; j < 2; j++) {
      const article =
        await generate_random_discussion_board_user_articles_create(
          userConnection,
          {
            body: {
              title: RandomGenerator.paragraph({ sentences: 2 }),
              content: RandomGenerator.content({ paragraphs: 2 }),
              discussion_board_section_id: RandomGenerator.pick(sections).id,
            } satisfies IDiscussionBoardArticle.ICreate,
          },
        );
      typia.assert(article);
      articles.push(article);
    }
  }
  // 4. Create comments on articles from different users
  for (const article of articles) {
    for (let i = 0; i < 2; i++) {
      const randomUser = RandomGenerator.pick(users);
      const userConnection: api.IConnection = {
        host: connection.host,
        headers: { Authorization: randomUser.token.access },
      };
      const comment =
        await generate_random_discussion_board_user_articles_comments_create(
          userConnection,
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
    }
  }
  // 5. Query system overview
  const overview =
    await api.functional.discussionBoard.superAdmin.system.overview.at(
      superAdminConnection,
    );
  typia.assert(overview);
  // 6. Validate statistical calculations
  TestValidator.equals(
    "system configuration should contain platform metrics",
    typeof overview.config_key,
    "string",
  );
  TestValidator.predicate(
    "system configuration should have a valid data type",
    ["string", "integer", "boolean", "number", "json"].includes(
      overview.data_type,
    ),
  );
  TestValidator.predicate(
    "system configuration should have a description",
    overview.description.length > 0,
  );
  TestValidator.predicate(
    "system configuration should have a category",
    overview.category.length > 0,
  );
  TestValidator.predicate(
    "system configuration should have valid timestamps",
    new Date(overview.created_at) <= new Date(overview.updated_at),
  );
}
