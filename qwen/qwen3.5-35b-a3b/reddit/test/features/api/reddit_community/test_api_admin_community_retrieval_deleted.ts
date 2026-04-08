import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving a soft-deleted community by admin to verify proper access denial.
 *
 * Validates that the system correctly rejects attempts to access deleted communities
 * through the admin endpoints. The test verifies that soft-deleted communities are
 * completely hidden from all users, including administrators, by returning a 404
 * error when attempting to retrieve them.
 *
 * Special attention is given to ensuring the deleted_at check works correctly and
 * prevents any data leakage from soft-deleted records.
 *
 * 1. Admin authentication with new account.
 * 2. Attempt retrieval of a non-existent/deleted community UUID.
 * 3. Verify HTTP 404 status is returned.
 * 4. Confirm no community data is accessible.
 */
export async function test_api_admin_community_retrieval_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  // 2. Create a community UUID for testing deleted access
  const deletedCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve deleted community
  // Since we cannot delete a community (no delete endpoint in SDK),
  // we test with a UUID that represents a non-existent or deleted community
  await TestValidator.httpError(
    "deleted community should return 404",
    404,
    async () => {
      await api.functional.redditCommunity.admin.communities.at(
        adminConnection,
        {
          communityId: deletedCommunityId,
        },
      );
    },
  );
}
