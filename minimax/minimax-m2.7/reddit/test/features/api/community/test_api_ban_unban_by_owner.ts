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

export async function test_api_ban_unban_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner creates community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerSession = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerSession);
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Member joins the community
  const memberConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(memberConnection, {});
  typia.assert(memberSession);
  // 3. Owner bans the member
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: {
        bannedUsername: memberSession.username,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(ban);
  // 4. Owner unbans the member via DELETE endpoint
  await api.functional.redditClone.member.communities.bans.erase(
    ownerConnection,
    {
      communityName: community.name,
      banId: ban.id,
    },
  );
}
