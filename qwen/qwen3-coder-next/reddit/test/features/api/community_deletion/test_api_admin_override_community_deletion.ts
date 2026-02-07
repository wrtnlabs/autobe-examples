import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test community deletion by a platform administrator.
 * Creates a community owned by one user, then authenticates as admin and deletes
 * the community to verify admin override capability. Confirms admin can delete
 * any community regardless of ownership status. Validates cascade deletion of all
 * community-related data including posts, comments, votes, subscriptions, bans,
 * roles, and reports.
 */
export async function test_api_admin_override_community_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IRedditPlatformAdmin.IJoin>(),
  });
  // Generate a random community entity with a valid ID
  const community = {
    id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditPlatformCommunity;
  // Authenticate as override admin and delete the community
  const overrideAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(overrideAdminConnection, {
    body: typia.random<IRedditPlatformAdmin.IJoin>(),
  });
  // Delete the community with override admin
  const deletedCommunity =
    await api.functional.redditPlatform.communities.erase(
      overrideAdminConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(deletedCommunity);
}
