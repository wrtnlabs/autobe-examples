import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_profile_create } from "../../../generate/generate_random_reddit_like_community_member_profile_create";
import { prepare_random_reddit_like_community_profile } from "../../../prepare/prepare_random_reddit_like_community_profile";
import { prepare_random_reddit_like_community_profile_image } from "../../../prepare/prepare_random_reddit_like_community_profile_image";

/**
 * Test that public profiles are accessible without authentication.
 *
 * Validates the public profile retrieval endpoint by registering a new member account, initializing their profile with public-facing display data (display name and bio text), and then accessing the profile through an unauthenticated connection. Confirms that profiles are fully public and accessible to all platform participants including unauthenticated guests.
 *
 * The endpoint returns the complete profile including display name, bio text, aggregated karma score, and active avatar image metadata, with all this data being accessible without any authentication token.
 *
 * 1. Register a new member account to create valid member data.
 * 2. Initialize the member's profile with public-facing display data (display name and bio).
 * 3. Create an unauthenticated connection as a separate guest connection.
 * 4. Execute the target GET request using the unauthenticated connection with actual memberId and profileId.
 * 5. Validate that the response returns the complete IRedditLikeCommunityProfile object with all expected fields.
 */
export async function test_api_profile_public_access_success(
  connection: api.IConnection,
) {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {} satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  typia.assert(member);
  // 2. Initialize the member's profile with display name and bio
  const profile =
    await generate_random_reddit_like_community_member_profile_create(
      memberConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(profile);
  // 3. Create unauthenticated (guest) connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 4. Retrieve profile as unauthenticated guest using actual IDs
  const publicProfile =
    await api.functional.redditLikeCommunity.members.profiles.at(
      guestConnection,
      {
        memberId: member.id,
        profileId: profile.id,
      },
    );
  typia.assert(publicProfile);
  // 5. Validate response contains complete profile data
  TestValidator.equals("profile ID matches", publicProfile.id, profile.id);
  TestValidator.equals(
    "display name matches",
    publicProfile.display_name,
    profile.display_name,
  );
  TestValidator.equals("bio matches", publicProfile.bio, profile.bio);
  TestValidator.equals("member ID matches", publicProfile.member.id, member.id);
  // Validate that full profile structure is returned (not just summary)
  TestValidator.predicate(
    "returned full profile with member relation",
    publicProfile.member !== undefined,
  );
  TestValidator.predicate(
    "returned profile with timestamp fields",
    publicProfile.created_at !== undefined,
  );
}
