import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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
import { generate_random_community_platform_moderator_communities_bans_create } from "../../../generate/generate_random_community_platform_moderator_communities_bans_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_communities_moderators_create } from "../../../generate/generate_random_community_platform_user_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_ban_details_view_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://test.com",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 2. Create a user to be banned
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(userAuth);
  // 3. Create community as user (communities are created by users, not moderators)
  const community =
    await api.functional.communityPlatform.user.communities.create(
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
  // 4. Assign moderator role to the moderator user in the community
  // Note: The moderator assignment expects a regular user ID, but we have a moderator
  // Since moderators are separate from users, we need to create a regular user for the moderator
  const moderatorUserConnection: api.IConnection = { host: connection.host };
  const moderatorUserAuth = await authorize_user_join(moderatorUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorUserAuth);
  const moderatorAssignment =
    await api.functional.communityPlatform.user.communities.moderators.create(
      userConnection,
      {
        communityId: community.id,
        body: {
          user_id: moderatorUserAuth.id,
          role_level: "admin",
          notes: "Community owner",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Create ban record for the user using the moderator connection
  const ban =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          user_id: userAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days from now
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 6. Retrieve ban details
  const retrievedBan =
    await api.functional.communityPlatform.moderator.communities.bans.at(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // 7. Validate ban details comprehensively
  TestValidator.equals("ban id matches", retrievedBan.id, ban.id);
  TestValidator.equals("ban reason matches", retrievedBan.reason, ban.reason);
  TestValidator.equals("ban status is active", retrievedBan.status, "active");
  TestValidator.equals(
    "community id matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "banned user id matches",
    retrievedBan.user.id,
    userAuth.id,
  );
  TestValidator.equals(
    "banned user username matches",
    retrievedBan.user.username,
    userAuth.username,
  );
  TestValidator.equals(
    "moderator id matches",
    retrievedBan.moderator.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "moderator email matches",
    retrievedBan.moderator.email,
    moderatorAuth.email,
  );
  TestValidator.predicate(
    "banned_at is valid timestamp",
    retrievedBan.banned_at !== null &&
      !isNaN(new Date(retrievedBan.banned_at).getTime()),
  );
  TestValidator.predicate(
    "expires_at is valid timestamp",
    retrievedBan.expires_at !== null &&
      !isNaN(new Date(retrievedBan.expires_at!).getTime()),
  );
  TestValidator.equals(
    "revoked_at is null for active ban",
    retrievedBan.revoked_at,
    null,
  );
  TestValidator.equals(
    "revoke_reason is null for active ban",
    retrievedBan.revoke_reason,
    null,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    !isNaN(new Date(retrievedBan.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    !isNaN(new Date(retrievedBan.updated_at).getTime()),
  );
  // Validate summary objects have required properties
  TestValidator.predicate(
    "community summary has id",
    retrievedBan.community.id !== undefined,
  );
  TestValidator.predicate(
    "community summary has name",
    retrievedBan.community.name !== undefined,
  );
  TestValidator.predicate(
    "user summary has id",
    retrievedBan.user.id !== undefined,
  );
  TestValidator.predicate(
    "user summary has username",
    retrievedBan.user.username !== undefined,
  );
  TestValidator.predicate(
    "moderator summary has id",
    retrievedBan.moderator.id !== undefined,
  );
  TestValidator.predicate(
    "moderator summary has email",
    retrievedBan.moderator.email !== undefined,
  );
}
