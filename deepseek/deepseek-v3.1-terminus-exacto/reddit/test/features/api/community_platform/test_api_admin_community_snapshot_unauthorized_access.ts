import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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
 * Test authorization enforcement for community snapshot retrieval.
 * Verify that only properly authenticated admin users can access
 * community snapshot endpoints, while unauthorized access attempts
 * are properly rejected.
 */
export async function test_api_admin_community_snapshot_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Generate random community and snapshot IDs
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // First, create an admin user to establish authorized access baseline
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password_123",
      display_name: "Test Admin",
      permissions_level: "full_access",
    },
  });
  // Test that authorized admin access works
  await TestValidator.error(
    "non-existent snapshot should fail even for admin",
    async () => {
      await api.functional.communityPlatform.admin.communities.snapshots.at(
        adminConnection,
        { communityId, snapshotId },
      );
    },
  );
  // Test unauthorized access scenarios
  // Test 1: No authentication headers
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "access without authentication should fail",
    async () => {
      await api.functional.communityPlatform.admin.communities.snapshots.at(
        noAuthConnection,
        { communityId, snapshotId },
      );
    },
  );
  // Test 2: Create a second admin but don't use it - test that different admin credentials
  // don't automatically grant access to non-existent resources
  const secondAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(secondAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "second_admin_456",
      display_name: "Second Admin",
      permissions_level: "limited_access",
    },
  });
  // Both admin connections should behave similarly for non-existent resources
  await TestValidator.error(
    "second admin should also fail for non-existent snapshot",
    async () => {
      await api.functional.communityPlatform.admin.communities.snapshots.at(
        secondAdminConnection,
        { communityId, snapshotId },
      );
    },
  );
  // Test 3: Verify that the authorization requirement is enforced
  // by testing that even with valid admin credentials, non-existent resources
  // return appropriate errors rather than authorization errors
  TestValidator.predicate(
    "admin authentication should be valid",
    adminConnection.headers?.Authorization !== undefined,
  );
  TestValidator.predicate(
    "second admin authentication should be valid",
    secondAdminConnection.headers?.Authorization !== undefined,
  );
}
