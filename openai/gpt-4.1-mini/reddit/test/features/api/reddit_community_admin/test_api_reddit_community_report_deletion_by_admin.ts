import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";

export async function test_api_reddit_community_report_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register (join) admin user to authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePass123";
  const authorizedAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(authorizedAdmin);

  // 2. Delete a content report by generating a UUID for the id
  const reportId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.redditCommunity.admin.redditCommunityReports.erase(
    connection,
    {
      id: reportId,
    },
  );

  // 3. If no error thrown, test is successful
  TestValidator.predicate("content report deleted without error", true);
}
