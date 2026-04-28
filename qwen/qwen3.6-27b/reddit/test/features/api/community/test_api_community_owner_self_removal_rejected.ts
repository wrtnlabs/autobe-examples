import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

/**
 * Validates the self-protection rule preventing community owners from removing their own moderator assignment.
 *
 * Tests the business rule that community owners cannot voluntarily remove themselves as moderators, which would leave the community without any administrative authority. When the owner attempts to delete their own moderator record, the system must reject the operation with a 409 Conflict error, preserving the community's governance structure.
 *
 * 1. Authenticate a new member account on the platform.
 * 2. Create a community where the member automatically becomes the owner and highest authority.
 * 3. Owner attempts to delete their own moderator assignment record using the community identifier as the moderator assignment reference.
 * 4. Verify the system rejects this action with a 409 Conflict HTTP error.
 */
export async function test_api_community_owner_self_removal_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, { body: {} });
  typia.assert(member);
  // 2. Create a community - member automatically becomes the owner/creator
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Use community ID as the moderator assignment identifier for self-removal test
  const communityModeratorId: string & tags.Format<"uuid"> = community.id;
  // 4. & 5. Attempt to delete own moderator assignment - expect 409 Conflict rejection
  await TestValidator.httpError(
    "owner cannot remove their own moderator assignment",
    409,
    async () =>
      await api.functional.redditLikeCommunity.member.communities.community_moderators.erase(
        memberConnection,
        {
          communityId: community.id,
          communityModeratorId,
        },
      ),
  );
}
