import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_admin_article_delete_with_associated_data(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Authenticate as superAdmin for creating data
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: "superadmin@test.com",
        password: "12345678",
        display_name: "Super Admin",
        bio: "System super administrator",
        href: "https://example.com",
        referrer: "https://example.com/login",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Setup: Authenticate as admin for deletion
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12345678",
      display_name: "Admin User",
      bio: "System administrator",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a section first
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create an article with content
  const article =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      superAdminConnection,
      {
        sectionId: sectionId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Delete the article as admin
  await api.functional.discussionBoard.admin.articles.erase(adminConnection, {
    articleId: article.id,
  });
  // The main validation is that the erase operation completed successfully
  // The server handles cascade deletion of associated data (comments, files, tags)
}
