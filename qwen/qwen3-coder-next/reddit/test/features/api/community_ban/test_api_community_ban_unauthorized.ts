import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanRecord";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_communities_bans_ban_user } from "../../../generate/generate_random_reddit_clone_communities_bans_ban_user";
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { prepare_random_reddit_clone_ban_record } from "../../../prepare/prepare_random_reddit_clone_ban_record";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_community_ban_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as owner to create community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = typia.random<IRedditCloneOwner.IJoin>();
  await authorize_owner_join(ownerConnection, { body: ownerData });
  // 2. Create a community for testing
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_url: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Auth as regular member without moderation privileges
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = typia.random<IRedditCloneMember.IJoin>();
  await authorize_member_join(memberConnection, { body: memberData });
  // 4. Attempt to ban a user as a regular member (should fail due to unauthorized)
  const targetUser = typia.random<IRedditCloneMember.IJoin>();
  const bannedMember = await api.functional.redditClone.auth.member.join(
    connection,
    {
      body: targetUser,
    },
  );
  typia.assert(bannedMember);
  await TestValidator.error(
    "should reject ban attempt by unauthorized member",
    async () => {
      await api.functional.redditClone.communities.bans.banUser(
        memberConnection,
        {
          communityId: community.id,
          body: {
            member_id: bannedMember.id,
            reason: "Testing unauthorized ban",
          } satisfies IRedditCloneBanRecord.ICreate,
        },
      );
    },
  );
}
