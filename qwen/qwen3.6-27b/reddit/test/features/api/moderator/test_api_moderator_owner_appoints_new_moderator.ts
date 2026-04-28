import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_moderators_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Test that community owner successfully appoints a registered member as moderator.
 *
 * Validates the complete moderator appointment workflow including owner authentication, community creation, target member registration, and the moderator assignment operation. Verifies that the owner can grant moderator authority to another member within their community.
 *
 * Special attention is given to verifying that the appointed moderator receives the correct 'moderator' authority type (not 'owner'), and that the response contains accurate references to both the target member's identity and the community where moderation privileges are granted.
 *
 * 1. Authenticate member A who will become the community owner.
 * 2. Member A creates a community, automatically receiving OWNER authority.
 * 3. Authenticate member B who will be appointed as moderator.
 * 4. Member A appoints member B as moderator of the community.
 * 5. Validate that the moderator assignment response contains correct authority type, member reference, and community reference.
 */
export async function test_api_moderator_owner_appoints_new_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member A as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(ownerConnection, {
    body: {},
  });
  typia.assert(memberA);
  // 2. Owner creates community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Authenticate member B (target to appoint)
  const targetConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(targetConnection, {
    body: {},
  });
  typia.assert(memberB);
  // 4. Owner appoints member B as moderator
  const body = {
    member_id: memberB.id,
    community_id: community.id,
  } satisfies IRedditLikeCommunityModerator.ICreate;
  const moderator =
    await api.functional.redditLikeCommunity.member.moderators.create(
      ownerConnection,
      { body },
    );
  typia.assert(moderator);
  // 5. Validate response
  TestValidator.equals(
    "authority type is moderator",
    moderator.authority_type,
    "moderator",
  );
  TestValidator.equals(
    "appointed member id matches",
    moderator.member.id,
    memberB.id,
  );
  TestValidator.equals(
    "community id matches",
    moderator.community.id,
    community.id,
  );
  TestValidator.equals(
    "member username matches",
    moderator.member.username,
    memberB.username,
  );
}
