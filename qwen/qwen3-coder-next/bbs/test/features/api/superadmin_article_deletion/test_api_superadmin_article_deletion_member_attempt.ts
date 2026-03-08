import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test that regular members cannot delete articles through super admin endpoint.
 * 1. Super admin creates an article
 * 2. Regular member attempts to delete the article
 * 3. Verify 403 Forbidden response
 */
export async function test_api_superadmin_article_deletion_member_attempt(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and login as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
      display_name: "Super Admin",
      bio: "Test super admin user",
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Login as super admin (not join again)
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Create an article as super admin
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      superAdminConnection,
      {
        sectionId: sectionId,
        body: {
          title: "Test Article for Deletion",
          content: "This article is created for testing deletion permissions.",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  const articleId = article.id;
  // Step 2: Create regular member user by joining and logging in
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      display_name: "Regular Member",
      bio: "Test regular member user",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // Step 3: Attempt to delete article as regular member (should fail with 403)
  await TestValidator.httpError(
    "regular member cannot delete article via super admin endpoint",
    403,
    async () => {
      await api.functional.discussionBoard.superAdmin.articles.erase(
        memberConnection,
        {
          articleId: articleId,
        },
      );
    },
  );
}
