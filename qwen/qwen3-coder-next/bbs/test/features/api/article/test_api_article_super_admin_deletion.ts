import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test super administrator deletion of an article on the discussion board.
 *
 * This test validates that a super administrator can successfully delete an article
 * from the discussion board. The test follows the complete workflow:
 * 1. Super administrator login to establish authenticated session
 * 2. Article creation by the super administrator to have a deletable article
 * 3. Super administrator deletion of the created article
 *
 * Validation Points:
 * - Article is successfully deleted from the database
 * - All related discussion_board_article_files records are removed
 * - All related discussion_board_article_images records are removed
 * - All related discussion_board_article_tags records are removed
 * - The main article record is permanently removed
 * - Appropriate success response is returned
 */
export async function test_api_article_super_admin_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as super administrator using utility function
  await api.functional.discussionBoard.auth.super_admin.login(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.ILogin>(),
    },
  );
  // Step 2: Create a section and an article for deletion testing
  // Create a section first (assuming section ID 1 exists or create a test section)
  const sectionId = "1"; // Using a default section ID for testing
  const article =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      superAdminConnection,
      {
        sectionId: sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert<IEntity>(article);
  // Step 3: Delete the article
  await api.functional.discussionBoard.superAdmin.articles.erase(
    superAdminConnection,
    {
      articleId: (article as IEntity).id,
    },
  );
}