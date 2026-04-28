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
import { generate_random_reddit_like_community_member_communities_community_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_moderators_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Test community moderator appointment by the community owner.
 *
 * Validates the complete moderator appointment workflow where a community owner designates another member as a moderator for their community. The owner must be authenticated and hold OWNER authority to perform this action.
 *
 * Ensures that the newly created moderator record correctly references the appointed member, the target community, and carries the MODERATOR authority type rather than OWNER.
 *
 * 1. Register the community owner account.
 * 2. Create a new community (owner automatically receives OWNER authority).
 * 3. Register a separate member account to be appointed as moderator.
 * 4. Owner appoints the target member as a moderator for the community.
 * 5. Verify the moderator record matches the appointed member, community, and has MODERATOR authority type.
 */
export async function test_api_community_moderator_owner_appoints_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerToken: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username: RandomGenerator.name(1),
      },
    });
  typia.assert(ownerToken);
  // 2. Create a new community (owner becomes creator/OWNER)
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Register the target member who will be appointed as moderator
  const targetConnection: api.IConnection = { host: connection.host };
  const targetToken: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(targetConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username: RandomGenerator.name(1),
      },
    });
  typia.assert(targetToken);
  // 4. Owner appoints target member as moderator for the community
  const moderator: IRedditLikeCommunityModerator =
    await generate_random_reddit_like_community_member_communities_community_moderators_create(
      ownerConnection,
      {
        body: { member_id: targetToken.id },
        params: { communityId: community.id },
      },
    );
  typia.assert(moderator);
  // 5. Validate the moderator record
  TestValidator.equals(
    "moderated member matches target",
    moderator.member.id,
    targetToken.id,
  );
  TestValidator.equals(
    "moderated community matches created one",
    moderator.community.id,
    community.id,
  );
  TestValidator.equals(
    "authority type is MODERATOR",
    moderator.authority_type,
    "MODERATOR",
  );
}
