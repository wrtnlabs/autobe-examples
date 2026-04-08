import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
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
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_community_ban_removal_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member1 (moderator/owner) via authorize_member_join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 2. Create a community with member1 as owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 3. Authenticate member2 (the user who will be banned)
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUser = await authorize_member_join(bannedUserConnection, {});
  typia.assert(bannedUser);
  // 4. Subscribe member2 to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      bannedUserConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Create a ban for member2 by member1 (moderator)
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    moderatorConnection,
    {
      params: {
        communityCode: community.name,
      },
      body: {
        reason: "Test ban for unban verification",
        redditCloneUserId: bannedUser.id,
      } satisfies IRedditCloneCommunityBan.ICreate,
    },
  );
  typia.assert(ban);
  // 6. Verify the ban was created successfully (deleted_at is null)
  TestValidator.equals("ban is active", ban.deletedAt, null);
  TestValidator.equals("banned user matches", ban.bannedUser.id, bannedUser.id);
  TestValidator.equals("issuer matches moderator", ban.issuer.id, moderator.id);
  TestValidator.equals("community matches", ban.community.id, community.id);
  // 7. Remove the ban via DELETE endpoint with member1's connection
  await api.functional.redditClone.member.communities.bans.erase(
    moderatorConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 8. Verify member2 can subscribe again to the community (gaining back posting privileges)
  const reSubscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      bannedUserConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(reSubscription);
  TestValidator.equals(
    "re-subscription community matches",
    reSubscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "re-subscription member matches",
    reSubscription.member.id,
    bannedUser.id,
  );
}
