import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityAnnouncement";
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
import { generate_random_community_platform_admin_communities_announcements_create } from "../../../generate/generate_random_community_platform_admin_communities_announcements_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_announcement } from "../../../prepare/prepare_random_community_platform_community_announcement";

/**
 * Test community announcement creation with default active status.
 * 1. Create admin account via join
 * 2. Create community as a user
 * 3. Create announcement as admin with minimal required fields
 * 4. Verify announcement defaults: status='active', is_pinned=false
 * 5. Validate relationships and timestamps
 */
export async function test_api_announcement_creation_with_default_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create user connection and community
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 3. Create announcement with minimal required fields
  const announcement =
    await generate_random_community_platform_admin_communities_announcements_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          title: "Community Announcement",
          content:
            "This is an important announcement for all community members.",
        },
      },
    );
  typia.assert(announcement);
  // 4. Validate default values
  TestValidator.equals(
    "status defaults to active",
    announcement.status,
    "active",
  );
  TestValidator.equals(
    "is_pinned defaults to false",
    announcement.is_pinned,
    false,
  );
  // 5. Validate relationships
  TestValidator.equals(
    "author matches admin user",
    announcement.author.id,
    admin.id,
  );
  TestValidator.equals(
    "community matches created community",
    announcement.community.id,
    community.id,
  );
  // 6. Validate timestamps
  TestValidator.predicate(
    "created_at is valid ISO string",
    () => !isNaN(Date.parse(announcement.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    () => !isNaN(Date.parse(announcement.updated_at)),
  );
  // 7. Additional field validations
  TestValidator.equals(
    "title matches input",
    announcement.title,
    "Community Announcement",
  );
  TestValidator.equals(
    "content matches input",
    announcement.content,
    "This is an important announcement for all community members.",
  );
  TestValidator.predicate("id is valid UUID", () =>
    /^[0-9a-f-]{36}$/i.test(announcement.id),
  );
}
