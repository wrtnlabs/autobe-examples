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
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";

export async function test_api_moderator_role_update_owner_immutable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner connection
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community - owner role is automatically assigned and immutable
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Owner attempts to change their own role from 'owner' to 'moderator'
  // This should fail because owner role is the highest authority level and cannot be demoted
  // The moderatorId is the owner's member ID since they are the moderator of their own community
  await TestValidator.error("owner role is immutable", async () => {
    await api.functional.redditClone.member.communities.moderators.update(
      ownerConnection,
      {
        communityName: community.name,
        moderatorId: owner.id,
        body: {
          role: "moderator",
        } satisfies IRedditCloneModeratorSnapshot.IUpdate,
      },
    );
  });
}
