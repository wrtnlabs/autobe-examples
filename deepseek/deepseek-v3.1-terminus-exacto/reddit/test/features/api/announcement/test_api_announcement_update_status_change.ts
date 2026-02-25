import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityAnnouncement";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_announcement } from "../../../prepare/prepare_random_community_platform_community_announcement";

export async function test_api_announcement_update_status_change(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Create user connection and authenticate
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
  // Create community via user connection
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create initial active announcement via moderator connection
  const announcement =
    await generate_random_community_platform_moderator_communities_announcements_create(
      moderatorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          is_pinned: true,
          status: "active" as const,
        } satisfies ICommunityPlatformCommunityAnnouncement.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(announcement);
  // Validate initial announcement is active and pinned
  TestValidator.equals(
    "initial status is active",
    announcement.status,
    "active",
  );
  TestValidator.equals("initial pinned status", announcement.is_pinned, true);
  // Update announcement status to inactive while preserving pinned status
  const updatedAnnouncement =
    await api.functional.communityPlatform.moderator.communities.announcements.update(
      moderatorConnection,
      {
        communityId: community.id,
        announcementId: announcement.id,
        body: {
          status: "inactive" as const,
          is_pinned: true,
        } satisfies ICommunityPlatformCommunityAnnouncement.IUpdate,
      },
    );
  typia.assert(updatedAnnouncement);
  // Validate updated announcement has correct status and preserved pinned status
  TestValidator.equals(
    "updated status is inactive",
    updatedAnnouncement.status,
    "inactive",
  );
  TestValidator.equals(
    "pinned status preserved",
    updatedAnnouncement.is_pinned,
    true,
  );
  TestValidator.equals(
    "id remains the same",
    updatedAnnouncement.id,
    announcement.id,
  );
  TestValidator.equals(
    "community remains the same",
    updatedAnnouncement.community.id,
    community.id,
  );
  // Test that inactive announcements can still be updated
  const finalUpdate =
    await api.functional.communityPlatform.moderator.communities.announcements.update(
      moderatorConnection,
      {
        communityId: community.id,
        announcementId: announcement.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformCommunityAnnouncement.IUpdate,
      },
    );
  typia.assert(finalUpdate);
  // Validate final update preserved inactive status
  TestValidator.equals(
    "final status remains inactive",
    finalUpdate.status,
    "inactive",
  );
  TestValidator.notEquals(
    "title was updated",
    finalUpdate.title,
    announcement.title,
  );
}
