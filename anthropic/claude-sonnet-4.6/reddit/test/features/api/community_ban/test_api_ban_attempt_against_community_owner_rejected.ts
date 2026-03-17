import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

export async function test_api_ban_attempt_against_community_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Member A (the community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuth);
  const ownerMemberId = memberAAuth.id;
  // Step 2: Create a community with Member A as owner
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register Member B (will be assigned as moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuth);
  const moderatorMemberId = memberBAuth.id;
  // Step 4: Have Member B subscribe to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberBConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // Step 5: As Member A (owner), assign Member B as a moderator
  const moderator =
    await generate_random_community_member_communities_moderators_create(
      memberAConnection,
      {
        body: { member_id: moderatorMemberId },
        params: { communityId: community.id },
      },
    );
  typia.assert(moderator);
  // Test 1: As Member B (moderator), attempt to ban Member A (the owner) — should be rejected
  await TestValidator.error(
    "moderator cannot ban the community owner",
    async () => {
      await generate_random_community_member_communities_bans_create(
        memberBConnection,
        {
          body: {
            banned_member_id: ownerMemberId,
            reason: "Attempting to ban the owner",
          },
          params: { communityId: community.id },
        },
      );
    },
  );
  // Test 2: As Member A (owner), attempt to self-ban — should also be rejected
  await TestValidator.error("owner cannot self-ban", async () => {
    await generate_random_community_member_communities_bans_create(
      memberAConnection,
      {
        body: {
          banned_member_id: ownerMemberId,
          reason: "Attempting to self-ban as owner",
        },
        params: { communityId: community.id },
      },
    );
  });
}
