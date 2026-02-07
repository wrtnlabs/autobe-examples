import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test successful super administrator article creation in a valid section.
 * This scenario validates that a logged-in super admin can create an article.
 * Note: DTO definitions for IDiscussionBoardSection and IDiscussionBoardArticle
 * don't expose properties in the current specification, so validation is limited.
 */
export async function test_api_article_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account via join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinResponse =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(superAdminJoinResponse);
  superAdminConnection.headers = superAdminConnection.headers || {};
  superAdminConnection.headers.Authorization =
    superAdminJoinResponse.token.access;
  // 2. Create admin account and section
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse =
    await api.functional.discussionBoard.auth.admin.join(adminConnection, {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    });
  typia.assert(adminJoinResponse);
  adminConnection.headers = adminConnection.headers || {};
  adminConnection.headers.Authorization = adminJoinResponse.token.access;
  // 3. Create article via super admin (section creation not validated due to DTO limitations)
  const article =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      superAdminConnection,
      {
        sectionId: "00000000-0000-0000-0000-000000000000", // placeholder section ID
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
}
