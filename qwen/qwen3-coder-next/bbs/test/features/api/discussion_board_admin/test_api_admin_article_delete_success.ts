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

export async function test_api_admin_article_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin to create admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminUser =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "1234!@#$",
          display_name: "Super Admin",
          bio: "Super administrator for testing",
          href: "https://example.com",
          referrer: "https://example.com/ref",
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(superAdminUser);
  // 2. Create admin user and store the email
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResponse =
    await api.functional.discussionBoard.auth.admin.join(superAdminConnection, {
      body: {
        email: adminEmail,
        password: "1234!@#$",
        display_name: "Test Admin",
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(adminJoinResponse);
  // 3. Authenticate as admin user using stored email
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLoginResponse =
    await api.functional.discussionBoard.auth.admin.login(adminConnection, {
      body: {
        email: adminEmail,
        password: "1234!@#$",
      } satisfies IDiscussionBoardAdmin.ILogin,
    });
  typia.assert(adminLoginResponse);
  // 4. Create an article using admin
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      adminConnection,
      {
        sectionId,
        body: {
          title: "Test Article for Deletion",
          content: "This article will be deleted by admin",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 5. Delete article as admin
  await api.functional.discussionBoard.admin.articles.erase(adminConnection, {
    articleId: article.id,
  });
  // 6. Verify article is deleted - attempt to delete again should fail
  try {
    await api.functional.discussionBoard.admin.articles.erase(adminConnection, {
      articleId: article.id,
    });
    throw new Error("Should have failed");
  } catch (error) {
    typia.assert(error);
  }
}
