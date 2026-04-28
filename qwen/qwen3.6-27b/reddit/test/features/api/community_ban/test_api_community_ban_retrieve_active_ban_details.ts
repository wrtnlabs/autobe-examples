import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_bans_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_bans_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";

/**
 * Test retrieving active ban details by ban ID to verify complete nested structure.
 *
 * Validates the complete ban retrieval flow including owner authentication, community creation, second member registration, ban issuance, and detailed ban retrieval. Ensures that the ban record correctly contains nested community, banned member, and issuing moderator information.
 *
 * Special attention is given to verifying that the community summary includes creator and subscriber_count, the banned member summary matches the registered second member, the moderator summary shows the correct role, and the active ban status is confirmed via null deleted_at.
 *
 * 1. Owner member registers and authenticates.
 * 2. Owner creates a community (automatically becomes owner).
 * 3. Second member registers (will be banned).
 * 4. Owner bans second member from the community with a reason.
 * 5. Retrieves the ban record by its banId.
 * 6. Validates ban id, community summary, member summary, moderator summary, reason, timestamps, and active status.
 */
export async function test_api_community_ban_retrieve_active_ban_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner member authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: ownerCredentials,
  });
  typia.assert(ownerAuth);
  // 2. Owner creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      { body: undefined },
    );
  typia.assert(community);
  // 3. Second member registration
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: bannedMemberCredentials,
  });
  typia.assert(bannedMemberAuth);
  // 4. Owner bans second member from the community
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const ban =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      ownerConnection,
      {
        body: { member_id: bannedMemberAuth.id, reason: banReason },
        params: { communityId: community.id },
      },
    );
  typia.assert(ban);
  // 5. Retrieve ban details by banId
  const retrievedBan = await api.functional.redditLikeCommunity.bans.at(
    ownerConnection,
    {
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // 6. Validate complete ban structure
  TestValidator.equals("ban id matches", retrievedBan.id, ban.id);
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
    "community description matches",
    retrievedBan.community.description,
    community.description,
  );
  TestValidator.equals(
    "community created_at matches",
    retrievedBan.community.created_at,
    community.created_at,
  );
  TestValidator.equals(
    "community creator id matches",
    retrievedBan.community.creator.id,
    community.creator.id,
  );
  TestValidator.equals(
    "banned member id matches",
    retrievedBan.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "banned member username matches",
    retrievedBan.member.username,
    bannedMemberAuth.username,
  );
  TestValidator.equals(
    "banned member email matches",
    retrievedBan.member.email,
    bannedMemberAuth.email,
  );
  TestValidator.equals(
    "moderator role is owner",
    retrievedBan.moderator.role,
    "owner",
  );
  TestValidator.equals("ban reason matches", retrievedBan.reason, banReason);
  TestValidator.equals(
    "deleted_at is null for active ban",
    retrievedBan.deleted_at,
    null,
  );
}
