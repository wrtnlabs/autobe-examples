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

export async function test_api_community_ban_lift_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator creates a community
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  const community =
    await generate_random_reddit_clone_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 2. Another member joins and subscribes to the community
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 3. Moderator bans the member from the community
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    moderatorConnection,
    {
      params: {
        communityCode: community.name,
      },
      body: {
        redditCloneUserId: member.id,
        reason: "Violating community rules",
      } satisfies IRedditCloneCommunityBan.ICreate,
    },
  );
  typia.assert(ban);
  // Verify ban is active (deletedAt is null)
  TestValidator.equals("ban is active", ban.deletedAt, null);
  // 4. Moderator lifts the ban using PUT update operation
  const unbannedBan =
    await api.functional.redditClone.member.communities.bans.update(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          reason: "User has apologized",
        } satisfies IRedditCloneCommunityBan.IUpdate,
      },
    );
  typia.assert(unbannedBan);
  // 5. Validate the ban record has deleted_at timestamp set (unbanned)
  TestValidator.predicate("ban is lifted", unbannedBan.deletedAt !== null);
  TestValidator.equals(
    "community matches",
    unbannedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "banned user matches",
    unbannedBan.bannedUser.id,
    member.id,
  );
  TestValidator.equals("issuer matches", unbannedBan.issuer.id, moderator.id);
}
