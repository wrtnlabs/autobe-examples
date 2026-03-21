import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
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
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_moderator_snapshot } from "../../../prepare/prepare_random_reddit_clone_moderator_snapshot";
import { prepare_random_reddit_clone_user_karma } from "../../../prepare/prepare_random_reddit_clone_user_karma";

export async function test_api_ban_details_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as moderator via /auth/member/join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  // Step 2: Create community via /member/communities
  const community =
    await generate_random_reddit_clone_member_communities_create(
      moderatorConnection,
      {},
    );
  // Step 3: Authenticate as target user to be banned via /auth/member/join
  const targetUserConnection: api.IConnection = { host: connection.host };
  const targetUser = await authorize_member_join(targetUserConnection, {});
  // Step 4: Appoint moderator role to authenticated user
  await generate_random_reddit_clone_member_communities_moderators_create(
    moderatorConnection,
    {
      params: { communityName: community.name },
      body: { memberUsername: moderator.username },
    },
  );
  // Step 5: Create ban on target user via /member/communities/{communityName}/bans
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    moderatorConnection,
    {
      params: { communityName: community.name },
      body: {
        bannedUsername: targetUser.username,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  // Step 6: Verify moderator has authorization to view ban via /member/communities/{communityName}/bans/{banId}
  const retrievedBan =
    await api.functional.redditClone.member.communities.bans.at(
      moderatorConnection,
      {
        communityName: community.name,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // Validate response contains all required fields
  TestValidator.equals("ban id matches", retrievedBan.id, ban.id);
  TestValidator.equals(
    "community name matches",
    retrievedBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "banned user username matches",
    retrievedBan.bannedUser.username,
    targetUser.username,
  );
  TestValidator.equals(
    "issuer username matches",
    retrievedBan.issuer.username,
    moderator.username,
  );
  TestValidator.predicate(
    "reason is not empty",
    retrievedBan.reason.length > 0,
  );
  TestValidator.predicate("created_at exists", !!retrievedBan.created_at);
  TestValidator.predicate(
    "permanent ban has null expires_at",
    retrievedBan.expires_at === null,
  );
}
