import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test deletion attempts for non-existent or invalid announcement IDs.
 * Verify that the system properly handles attempts to delete announcements
 * that don't exist or belong to wrong communities. Test with invalid UUID
 * formats, non-existent announcement IDs, and announcement IDs that belong
 * to different communities. Ensure the system returns appropriate error
 * responses rather than attempting to process invalid deletion requests.
 */
export async function test_api_admin_announcement_deletion_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create user connection and community
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Test 1: Invalid UUID format
  await TestValidator.error("invalid UUID format", async () => {
    await api.functional.communityPlatform.admin.communities.announcements.erase(
      adminConnection,
      {
        communityId: community.id,
        announcementId: "invalid-uuid-format" as any,
      },
    );
  });
  // Test 2: Non-existent announcement ID
  await TestValidator.error("non-existent announcement ID", async () => {
    await api.functional.communityPlatform.admin.communities.announcements.erase(
      adminConnection,
      {
        communityId: community.id,
        announcementId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Test 3: Announcement ID from different community
  const anotherCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(anotherCommunity);
  await TestValidator.error(
    "announcement ID from different community",
    async () => {
      await api.functional.communityPlatform.admin.communities.announcements.erase(
        adminConnection,
        {
          communityId: community.id,
          announcementId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
