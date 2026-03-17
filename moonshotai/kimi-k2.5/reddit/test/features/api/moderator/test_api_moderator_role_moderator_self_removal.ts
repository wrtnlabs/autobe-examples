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
 * Test that a moderator can voluntarily remove themselves from a community.
 *
 * This test validates the self-removal scenario where:
 * 1. An owner creates a moderator role for a member
 * 2. The member (now moderator) calls DELETE /redditLike/owner/moderators/{moderatorId}
 * 3. The system allows the self-removal operation according to business rules
 * 4. The moderator role is soft-deleted (deleted_at populated)
 *
 * Authorization allows moderators to remove themselves without owner intervention.
 */
export async function test_api_moderator_role_moderator_self_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner and authenticate for moderator management
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {});
  // 2. Create community owner (member) and authenticate
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwner = await authorize_member_join(
    communityOwnerConnection,
    {},
  );
  // 3. Create community using the community owner
  const community = await generate_random_reddit_like_member_communities_create(
    communityOwnerConnection,
    { body: {} },
  );
  typia.assert(community);
  // 4. Create member who will be the moderator and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember = await authorize_member_join(moderatorConnection, {});
  // 5. Owner creates moderator role for the member in the community
  const moderator = await generate_random_reddit_like_owner_moderators_create(
    ownerConnection,
    {
      body: {
        communityId: community.id,
        memberId: moderatorMember.id,
        canAddModerators: false,
      },
    },
  );
  typia.assert(moderator);
  // Validate the moderator was created correctly
  TestValidator.equals(
    "moderator member matches",
    moderator.member.id,
    moderatorMember.id,
  );
  TestValidator.equals(
    "moderator community matches",
    moderator.community.id,
    community.id,
  );
  TestValidator.equals("moderator is active", moderator.deleted_at, null);
  // 6. Moderator removes themselves from the community
  // This tests that moderators can perform self-removal without owner intervention
  await api.functional.redditLike.owner.moderators.erase(moderatorConnection, {
    moderatorId: moderator.id,
  });
}
