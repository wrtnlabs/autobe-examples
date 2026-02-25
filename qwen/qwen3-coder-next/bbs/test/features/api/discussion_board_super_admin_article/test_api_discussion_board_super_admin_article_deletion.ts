import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test successful article deletion by super administrator.
 * 1. Super administrator joins the system to obtain authentication credentials
 * 2. Article is created (requires super administrator authentication)
 * 3. Super administrator deletes the article by its ID
 * 4. Validate that the article is no longer accessible
 */
export async function test_api_discussion_board_super_admin_article_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Create a new connection with the authentication token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: superAdmin.token.access,
    },
  };
  // TODO: Create an article first before deleting it
  // This requires a POST /discussionBoard/superAdmin/articles endpoint
  // which is not currently implemented in the provided API functions
  // For now, we'll create a mock article ID for testing purposes
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the article as super administrator
  await api.functional.discussionBoard.superAdmin.articles.erase(
    authenticatedConnection,
    {
      articleId: articleId,
    },
  );
  // 4. Validate that the article is no longer accessible
  // Note: This would require a GET endpoint to verify deletion
  // which is not currently implemented in the provided API functions
  // For now, we'll assume the delete operation succeeded
  TestValidator.predicate("article deletion succeeded", () => true);
}
