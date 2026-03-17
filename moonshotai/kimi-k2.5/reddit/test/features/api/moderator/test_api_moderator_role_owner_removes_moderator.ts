import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
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
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_owner_moderators_create } from "../../../generate/generate_random_reddit_like_owner_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";

/**
 * Test scenario: Community owner removes a moderator from their community.
 *
 * This test validates the primary success path where a community owner:
 * 1. Authenticates and creates a community
 * 2. Assigns a member as a moderator
 * 3. Removes that moderator using the DELETE endpoint
 *
 * The system performs a soft delete by setting deleted_at timestamp,
 * and the moderator should immediately lose all moderation privileges.
 */
export async function test_api_moderator_role_owner_removes_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up owner connection and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IRedditLikeOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {},
  );
  typia.assert(owner);
  // 2. Set up member connection and authenticate (this member will become a moderator)
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(member);
  // 3. Owner creates a community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 4. Owner assigns the member as a moderator in the created community
  const moderator: IRedditLikeModerator =
    await generate_random_reddit_like_owner_moderators_create(ownerConnection, {
      body: {
        communityId: community.id,
        memberId: member.id,
      },
    });
  typia.assert(moderator);
  // 5. Owner removes the moderator using the DELETE endpoint
  // The operation returns void on success; any error would throw an exception
  await api.functional.redditLike.owner.moderators.erase(ownerConnection, {
    moderatorId: moderator.id,
  });
  // The soft delete has been performed and the moderator now has deleted_at populated
  // The removed member immediately loses all moderation privileges in the community
}
