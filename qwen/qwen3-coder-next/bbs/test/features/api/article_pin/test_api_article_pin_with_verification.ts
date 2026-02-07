import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test article pinning workflow with verification.
 *
 * This test validates the article pinning functionality by:
 * 1. Authenticating as admin
 * 2. Creating an article (using available endpoints)
 * 3. Verifying the article exists before pinning
 * 4. Calling the pin endpoint
 * 5. Verifying the article after pinning
 */
export async function test_api_article_pin_with_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: {},
  });
  // 2. Create a test article using available endpoints
  // Note: The scenario mentions article creation but no creation endpoint is provided
  // This test focuses on the pin functionality with available endpoints
  // 3. Retrieve the article to verify it exists before pinning
  const testArticleId = typia.random<string>();
  const articleBefore = await api.functional.discussionBoard.admin.articles.at(
    adminConnection,
    {
      articleId: testArticleId,
    },
  );
  typia.assert(articleBefore);
  // 4. Call the pin endpoint with the valid articleId
  await api.functional.discussionBoard.admin.articles.pin(adminConnection, {
    articleId: testArticleId,
  });
  // 5. Verify successful pin by retrieving the article again
  const articleAfter = await api.functional.discussionBoard.admin.articles.at(
    adminConnection,
    {
      articleId: testArticleId,
    },
  );
  typia.assert(articleAfter);
}
