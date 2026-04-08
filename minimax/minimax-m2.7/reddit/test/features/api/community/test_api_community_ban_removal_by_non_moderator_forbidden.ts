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

export async function test_api_community_ban_removal_by_non_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member1 (owner/moderator)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {});
  // 2. Create community with member1 as owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // 3. Authenticate member2 (user to be banned) and store auth result
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {});
  // 4. Authenticate member3 (regular subscriber, not moderator)
  const member3Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member3Connection, {});
  // 5. Subscribe member2 to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    {
      body: { communityId: community.id },
    },
  );
  // 6. Subscribe member3 to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    member3Connection,
    {
      body: { communityId: community.id },
    },
  );
  // 7. Create a ban for member2 by member1 (moderator)
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    member1Connection,
    {
      params: { communityCode: community.name },
      body: {
        redditCloneUserId: member2Auth.id,
        reason: "Test ban for violation",
      },
    },
  );
  typia.assert(ban);
  // 8. As member3 (non-moderator), attempt to remove the ban
  // This should fail with 403 Forbidden because member3 lacks moderator privileges
  await TestValidator.httpError(
    "non-moderator cannot unban users",
    403,
    async () => {
      await api.functional.redditClone.member.communities.bans.erase(
        member3Connection,
        {
          communityId: community.id,
          banId: ban.id,
        },
      );
    },
  );
}
