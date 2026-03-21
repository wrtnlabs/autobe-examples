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

/**
 * Test unbanning a user from a community by an appointed moderator.
 *
 * Scenario:
 * 1. Owner creates community
 * 2. Moderator member joins
 * 3. Target member joins
 * 4. Owner appoints moderator via POST /redditClone/member/communities/{communityName}/moderators
 * 5. Moderator bans target member via POST /redditClone/member/communities/{communityName}/bans
 * 6. Moderator unbans the target member via DELETE /redditClone/member/communities/{communityName}/bans/{banId}
 *
 * Verify: Response is 204 No Content, unbanning moderator can successfully lift bans they issued.
 */
export async function test_api_ban_unban_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner joins and creates community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Moderator member joins
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorAuth);
  // 3. Target member joins
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {});
  typia.assert(targetAuth);
  // 4. Owner appoints moderator
  const moderatorAppointment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
      },
    );
  typia.assert(moderatorAppointment);
  // 5. Moderator bans target member
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    moderatorConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(ban);
  // 6. Moderator unbans the target member via DELETE endpoint
  // Verify: Response is 204 No Content
  await api.functional.redditClone.member.communities.bans.erase(
    moderatorConnection,
    {
      communityName: community.name,
      banId: ban.id,
    },
  );
}
