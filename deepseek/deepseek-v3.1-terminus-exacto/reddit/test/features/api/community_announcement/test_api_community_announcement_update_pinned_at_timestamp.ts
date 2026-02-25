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

export async function test_api_community_announcement_update_pinned_at_timestamp(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create user connection and authenticate for community creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community as user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create initial unpinned announcement as admin
  const announcement =
    await generate_random_community_platform_admin_communities_announcements_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          is_pinned: false,
          status: "active",
        } satisfies ICommunityPlatformCommunityAnnouncement.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(announcement);
  // Verify initial state: is_pinned=false and pinned_at=null
  TestValidator.equals(
    "initial is_pinned should be false",
    announcement.is_pinned,
    false,
  );
  TestValidator.equals(
    "initial pinned_at should be null",
    announcement.pinned_at,
    null,
  );
  // First update: pin the announcement
  const pinnedAnnouncement =
    await api.functional.communityPlatform.admin.communities.announcements.update(
      adminConnection,
      {
        communityId: community.id,
        announcementId: announcement.id,
        body: {
          is_pinned: true,
        } satisfies ICommunityPlatformCommunityAnnouncement.IUpdate,
      },
    );
  typia.assert(pinnedAnnouncement);
  // Verify pinned state: is_pinned=true and pinned_at is set
  TestValidator.equals(
    "pinned is_pinned should be true",
    pinnedAnnouncement.is_pinned,
    true,
  );
  TestValidator.notEquals(
    "pinned pinned_at should not be null",
    pinnedAnnouncement.pinned_at,
    null,
  );
  TestValidator.predicate("pinned_at should be valid date-time", () => {
    if (!pinnedAnnouncement.pinned_at) return false;
    const date = new Date(pinnedAnnouncement.pinned_at);
    return !isNaN(date.getTime());
  });
  // Second update: unpin the announcement
  const unpinnedAnnouncement =
    await api.functional.communityPlatform.admin.communities.announcements.update(
      adminConnection,
      {
        communityId: community.id,
        announcementId: announcement.id,
        body: {
          is_pinned: false,
        } satisfies ICommunityPlatformCommunityAnnouncement.IUpdate,
      },
    );
  typia.assert(unpinnedAnnouncement);
  // Verify unpinned state: is_pinned=false and pinned_at=null
  TestValidator.equals(
    "unpinned is_pinned should be false",
    unpinnedAnnouncement.is_pinned,
    false,
  );
  TestValidator.equals(
    "unpinned pinned_at should be null",
    unpinnedAnnouncement.pinned_at,
    null,
  );
  // Verify other fields remain unchanged
  TestValidator.equals(
    "title should remain unchanged",
    unpinnedAnnouncement.title,
    announcement.title,
  );
  TestValidator.equals(
    "content should remain unchanged",
    unpinnedAnnouncement.content,
    announcement.content,
  );
  TestValidator.equals(
    "status should remain unchanged",
    unpinnedAnnouncement.status,
    announcement.status,
  );
}
