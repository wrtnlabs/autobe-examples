import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_user_karma } from "../../../prepare/prepare_random_reddit_clone_user_karma";

export async function test_api_ban_details_retrieval_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner via /auth/member/join
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Create community (authenticated user becomes owner automatically) via /member/communities
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Authenticate as another member to be banned
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUser = await authorize_member_join(bannedUserConnection, {});
  // 4. Issue ban on member as community owner
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      params: {
        communityName: community.name,
      },
      body: {
        bannedUsername: bannedUser.username,
        reason: "Test ban for violating community rules",
      },
    },
  );
  typia.assert(ban);
  // 5. Retrieve ban details as community owner (should have automatic access)
  const banDetails =
    await api.functional.redditClone.member.communities.bans.at(
      ownerConnection,
      {
        communityName: community.name,
        banId: ban.id,
      },
    );
  typia.assert(banDetails);
  // Validate complete ban record
  TestValidator.equals("ban ID matches", banDetails.id, ban.id);
  TestValidator.equals("reason matches", banDetails.reason, ban.reason);
  TestValidator.equals(
    "community name matches",
    banDetails.community.name,
    community.name,
  );
  TestValidator.equals(
    "banned user username matches",
    banDetails.bannedUser.username,
    bannedUser.username,
  );
  // Validate owner has automatic moderation access (no explicit moderator assignment needed)
  TestValidator.equals(
    "issuer is the community owner",
    banDetails.issuer.username,
    owner.username,
  );
  TestValidator.equals(
    "issuer ID matches owner ID",
    banDetails.issuer.id,
    owner.id,
  );
}
