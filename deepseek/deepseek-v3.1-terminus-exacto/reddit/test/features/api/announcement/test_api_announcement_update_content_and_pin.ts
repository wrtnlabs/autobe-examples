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

export async function test_api_announcement_update_content_and_pin(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account and store credentials
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "test1234";
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://test.com",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Create user account for community creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create a community as the user
  const community =
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
  typia.assert(community);
  // Create moderator login connection
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorLoginConnection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  // Create initial announcement
  const initialAnnouncement =
    await generate_random_community_platform_moderator_communities_announcements_create(
      moderatorLoginConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          is_pinned: false,
          status: "active",
        } satisfies ICommunityPlatformCommunityAnnouncement.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(initialAnnouncement);
  // Update announcement with new content and pinned status
  const updatedAnnouncement =
    await api.functional.communityPlatform.moderator.communities.announcements.update(
      moderatorLoginConnection,
      {
        communityId: community.id,
        announcementId: initialAnnouncement.id,
        body: {
          title: "Updated: " + RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          is_pinned: true,
        } satisfies ICommunityPlatformCommunityAnnouncement.IUpdate,
      },
    );
  typia.assert(updatedAnnouncement);
  // Validate the updated announcement
  TestValidator.equals(
    "announcement id remains the same",
    updatedAnnouncement.id,
    initialAnnouncement.id,
  );
  TestValidator.notEquals(
    "title should be updated",
    updatedAnnouncement.title,
    initialAnnouncement.title,
  );
  TestValidator.notEquals(
    "content should be updated",
    updatedAnnouncement.content,
    initialAnnouncement.content,
  );
  TestValidator.predicate(
    "is_pinned should be true",
    updatedAnnouncement.is_pinned === true,
  );
  TestValidator.predicate(
    "pinned_at should be set",
    updatedAnnouncement.pinned_at !== null,
  );
  TestValidator.predicate(
    "status should remain active",
    updatedAnnouncement.status === "active",
  );
  TestValidator.notEquals(
    "updated_at should be newer",
    updatedAnnouncement.updated_at,
    initialAnnouncement.updated_at,
  );
  TestValidator.equals(
    "community relationship unchanged",
    updatedAnnouncement.community.id,
    community.id,
  );
  TestValidator.equals(
    "author relationship unchanged",
    updatedAnnouncement.author.id,
    initialAnnouncement.author.id,
  );
}
