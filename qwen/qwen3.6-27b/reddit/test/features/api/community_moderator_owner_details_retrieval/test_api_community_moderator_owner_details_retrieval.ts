import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
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
 * Test community moderator details retrieval showing the owner role.
 *
 * Validates that when a member creates a community, they are automatically assigned as the moderator with the 'owner' role, which represents the highest authority. The test verifies that public retrieval of moderator assignment details correctly identifies the community creator as the owner.
 *
 * Special attention is given to ensuring the owner role is correctly assigned to the community creator, confirming that the creator holds supreme moderation authority within their community.
 *
 * 1. Register member User A on the platform.
 * 2. User A creates a new community, automatically receiving the owner role.
 * 3. Retrieve moderator assignment details for User A in the created community via public endpoint.
 * 4. Validate that the moderator role is 'owner', confirming the creator's highest authority.
 * 5. Validate that the community and member details are correctly referenced.
 */
export async function test_api_community_moderator_owner_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register User A to become the community creator/owner
  const userAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123",
      username: RandomGenerator.alphaNumeric(10),
    },
  });
  // 2. User A creates a community (automatically becomes owner)
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      userAConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Create a public connection to retrieve moderator details (endpoint is public)
  const publicConnection: api.IConnection = { host: connection.host };
  // 4. Retrieve moderator assignment for User A to verify owner role
  const moderatorDetails: IREdditLikeCommunityCommunityModerator =
    await api.functional.redditLikeCommunity.communities.moderators.at(
      publicConnection,
      {
        communityId: community.id,
        memberId: community.creator.id,
      },
    );
  typia.assert(moderatorDetails);
  // 5. Validate moderator details - role should be 'owner' for the creator
  TestValidator.equals(
    "creator should be owner role",
    moderatorDetails.role,
    "owner",
  );
  // 6. Validate that moderator details contain correct community reference
  TestValidator.equals(
    "community ID matches the created community",
    moderatorDetails.community.id,
    community.id,
  );
  // 7. Validate that moderator details contain correct member reference
  TestValidator.equals(
    "member ID matches the creator",
    moderatorDetails.member.id,
    community.creator.id,
  );
  // 8. Validate that the member's username matches the community creator's username
  TestValidator.equals(
    "member username matches creator",
    moderatorDetails.member.username,
    community.creator.username,
  );
  // 9. Validate that profile is present with an ID for the moderator member
  TestValidator.predicate(
    "moderator profile has an ID",
    moderatorDetails.profile.id.length > 0,
  );
}
