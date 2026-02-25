import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityAnnouncement";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_communities_announcements_create } from "../../../generate/generate_random_community_platform_moderator_communities_announcements_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_communities_moderators_create } from "../../../generate/generate_random_community_platform_user_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_announcement } from "../../../prepare/prepare_random_community_platform_community_announcement";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

/**
 * Test that a moderator cannot delete announcements from communities where they don't have moderator permissions.
 * Creates two separate moderator accounts, two communities, assigns each moderator to a different community,
 * creates an announcement in the first community, and attempts deletion with the second moderator.
 */
export async function test_api_announcement_deletion_cross_community_access(
  connection: api.IConnection,
): Promise<void> {
  // Create user account for community creation
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create first moderator account and authenticate
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1 = await authorize_moderator_join(moderator1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator1);
  // Create second moderator account and authenticate
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2 = await authorize_moderator_join(moderator2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator2);
  // Create first community using user connection
  const community1 =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // Create second community using user connection
  const community2 =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // Assign moderator1 to community1
  const moderatorAssignment1 =
    await generate_random_community_platform_user_communities_moderators_create(
      userConnection,
      {
        body: {
          user_id: moderator1.id,
          role_level: "moderator",
          notes: "Primary moderator",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
        params: { communityId: community1.id },
      },
    );
  typia.assert(moderatorAssignment1);
  // Assign moderator2 to community2
  const moderatorAssignment2 =
    await generate_random_community_platform_user_communities_moderators_create(
      userConnection,
      {
        body: {
          user_id: moderator2.id,
          role_level: "moderator",
          notes: "Primary moderator",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
        params: { communityId: community2.id },
      },
    );
  typia.assert(moderatorAssignment2);
  // Create announcement in community1 using moderator1
  const announcement =
    await generate_random_community_platform_moderator_communities_announcements_create(
      moderator1Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          is_pinned: false,
          status: "active",
        } satisfies ICommunityPlatformCommunityAnnouncement.ICreate,
        params: { communityId: community1.id },
      },
    );
  typia.assert(announcement);
  // Attempt to delete announcement using moderator2 (should fail)
  await TestValidator.error(
    "moderator cannot delete announcement from different community",
    async () => {
      await api.functional.communityPlatform.moderator.communities.announcements.erase(
        moderator2Connection,
        {
          communityId: community1.id,
          announcementId: announcement.id,
        },
      );
    },
  );
  // Verify announcement still exists by attempting to delete it with proper moderator
  await api.functional.communityPlatform.moderator.communities.announcements.erase(
    moderator1Connection,
    {
      communityId: community1.id,
      announcementId: announcement.id,
    },
  );
}
