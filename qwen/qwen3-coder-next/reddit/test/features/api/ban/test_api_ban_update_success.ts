import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_reddit_platform_admin_reddit_platform_bans_create } from "../../../generate/generate_random_reddit_platform_admin_reddit_platform_bans_create";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";

/**
 * Test successful ban update scenario: Create a ban record as an admin,
 * then update its reason and expiration time.
 * The update should preserve the core ban relationship (community_id, user_id)
 * while allowing modification of reason and expired_at fields.
 * Verify the updated record reflects the new values correctly.
 */
export async function test_api_ban_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and login for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredential = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: RandomGenerator.name(),
    display_name: null,
    bio: null,
  } satisfies IRedditPlatformAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminCredential,
  });
  // Create fresh connection with auth token
  const authAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.redditPlatform.auth.admin.login(authAdminConnection, {
    body: {
      email: adminAuth.email,
      password: "12345678",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 2. Create initial ban record using available endpoint
  // Generate mock community and member data
  const mockCommunity: IRedditPlatformCommunity.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    description: null,
    iconUrl: null,
    subscriberCount: randint(1, 1000),
  };
  const mockMember: IRedditPlatformMember.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    username: RandomGenerator.name(),
    displayName: null,
    avatarUrl: null,
  };
  const initialBan =
    await api.functional.redditPlatform.admin.redditPlatform.bans.create(
      authAdminConnection,
      {
        body: {
          community_id: mockCommunity.id,
          user_id: mockMember.id,
          reason: "Initial ban reason",
          expired_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(initialBan);
  // 3. Update the ban record
  const updatedBan =
    await api.functional.redditPlatform.admin.redditPlatform.bans.update(
      authAdminConnection,
      {
        banId: initialBan.id,
        body: {
          reason: "Updated ban reason with more details",
          expired_at: new Date(Date.now() + 86400000 * 14).toISOString(),
        } satisfies IRedditPlatformBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 4. Verify the update preserved core relationship and updated fields
  TestValidator.equals(
    "community_id preserved",
    updatedBan.community.id,
    mockCommunity.id,
  );
  TestValidator.equals("user_id preserved", updatedBan.user.id, mockMember.id);
  TestValidator.equals(
    "reason updated",
    updatedBan.reason,
    "Updated ban reason with more details",
  );
  TestValidator.notEquals(
    "expired_at changed",
    updatedBan.expiredAt,
    initialBan.expiredAt,
  );
}
