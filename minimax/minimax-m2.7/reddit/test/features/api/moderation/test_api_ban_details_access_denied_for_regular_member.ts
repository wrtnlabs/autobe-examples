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

export async function test_api_ban_details_access_denied_for_regular_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member who will become the community owner/moderator
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a community (owner automatically becomes the community owner)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  // 3. Authenticate as another member to be banned
  const bannedConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedConnection, {});
  // 4. Create a ban record (owner/moderator bans the other member)
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: {
        bannedUsername: bannedMember.username,
        reason: "Test ban for violation",
      },
    },
  );
  // 5. Authenticate as a third member (regular member without moderator privileges)
  const regularMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(regularMemberConnection, {});
  // 6. Attempt to view ban details as unauthorized regular member
  // Expected: 403 Forbidden - only moderators and owners can access ban details
  await TestValidator.httpError(
    "regular member should receive 403 when viewing ban details",
    403,
    async () =>
      await api.functional.redditClone.member.communities.bans.at(
        regularMemberConnection,
        {
          communityName: community.name,
          banId: ban.id,
        },
      ),
  );
}
