import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanOfMember";
import type { IRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanOfMember";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_community_owner_communities_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_owner_bans_filter_by_banned_actor_and_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityCommunityOwner.IJoin;
  const owner = await authorize_community_owner_join(ownerConnection, {
    body: ownerData,
  });
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  // 3. Create community
  const ownerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_community_owner_login(ownerLoginConnection, {
    body: {
      email: ownerData.email,
      password: ownerData.password,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  const community =
    await api.functional.redditCommunity.communityOwner.communities.create(
      ownerLoginConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Extract owner ID from community response
  const ownerId = community.owner.id;
  // 4. Create a ban on the member in this community (active ban)
  const banRequest = {
    community_id: community.id,
    banned_member_id: member.id,
  } satisfies IRedditCommunityBanOfMember.IRequest;
  const banCreationResponse =
    await api.functional.redditCommunity.communityOwner.communities.bans.index(
      ownerLoginConnection,
      {
        communityId: community.id,
        body: banRequest,
      },
    );
  typia.assert(banCreationResponse);
  if (banCreationResponse.data.length === 0) {
    throw new Error("No bans created");
  }
  const banId = banCreationResponse.data[0].id;
  // 5. Fetch ban by ID to confirm it exists and is active
  const banDetail = await api.functional.redditCommunity.communityOwner.bans.at(
    ownerLoginConnection,
    {
      banId,
    },
  );
  typia.assert(banDetail);
  TestValidator.equals("ban is active", banDetail.deleted_at, null);
  TestValidator.equals(
    "correct banned member",
    banDetail.bannedMember!.id,
    member.id,
  );
  TestValidator.equals(
    "correct community",
    banDetail.community.id,
    community.id,
  );
  // 6. Log in as community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Generate plaintext password for moderator
  const moderatorPlaintextPassword = RandomGenerator.alphaNumeric(16);
  // Create moderator with password_hash (not password)
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: moderatorPlaintextPassword, // Use plaintext password as hash for join
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    { body: moderatorData },
  );
  // Use the plaintext password for login (not password_hash)
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  await authorize_community_moderator_login(moderatorLoginConnection, {
    body: {
      email: moderatorData.email,
      password: moderatorPlaintextPassword, // Use stored plaintext password here
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });
  // 7. Filter bans globally (for owner) for active bans by banned_member_id
  const activeFilter = {
    banned_member_id: member.id,
    deleted_at: null,
  } satisfies IRedditCommunityBanOfMember.IRequest;
  const activeBans =
    await api.functional.redditCommunity.communityOwner.bans.index(
      ownerLoginConnection,
      {
        body: activeFilter,
      },
    );
  typia.assert(activeBans);
  TestValidator.equals(
    "one active ban found",
    activeBans.pagination.records,
    1,
  );
  TestValidator.equals(
    "banned member matches",
    activeBans.data[0].banned_actor.id,
    member.id,
  );
  TestValidator.equals(
    "moderator matches owner",
    activeBans.data[0].moderator.id,
    ownerId,
  );
  // 8. Filter bans globally for historical (deleted_at != null) - should return 0 since we didn't delete
  const historicalFilter = {
    banned_member_id: member.id,
    deleted_at: false, // Use false for "deleted_at != null" - historical bans
  } satisfies IRedditCommunityBanOfMember.IRequest;
  const historicalBans =
    await api.functional.redditCommunity.communityOwner.bans.index(
      ownerLoginConnection,
      {
        body: historicalFilter,
      },
    );
  typia.assert(historicalBans);
  TestValidator.equals(
    "no historical bans found",
    historicalBans.pagination.records,
    0,
  );
  // 9. Repeat the same filter from moderator perspective (should also return 0 for historical)
  const historialBansFromModerator =
    await api.functional.redditCommunity.communityModerator.bans.index(
      moderatorLoginConnection,
      {
        body: historicalFilter,
      },
    );
  typia.assert(historialBansFromModerator);
  TestValidator.equals(
    "no historical bans found via moderator",
    historialBansFromModerator.pagination.records,
    0,
  );
  // 10. Verify community context is still accessible
  const communityDetail =
    await api.functional.redditCommunity.communityOwner.communities.getById(
      ownerLoginConnection,
      {
        id: community.id,
      },
    );
  typia.assert(communityDetail);
  TestValidator.equals(
    "community still exists",
    communityDetail.id,
    community.id,
  );
}
