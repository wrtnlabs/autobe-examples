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
 * Test that unauthenticated guests can view any user's profile.
 *
 * Validates the public visibility rule where profiles are accessible without authentication credentials. A member joins the platform and initializes their profile with display name and bio, establishing a public profile.
 *
 * The endpoint is accessed using a base connection without any authorization headers, verifying that the profile retrieval does not require authentication. The response should return complete public profile data including display name, bio, karma score, member summary, and timestamps.
 *
 * The member summary returned in the profile contains only safe public fields (id, username, email, created_at) and does not expose sensitive data like password hashes or authentication tokens.
 *
 * 1. Member joins with email, password, username, and session context
 * 2. Member initializes profile with display name and bio
 * 3. Unauthenticated guest retrieves the profile using the profile ID
 * 4. Validates profile data matches the initialized data and contains expected public fields
 */
export async function test_api_profile_guest_access_without_login(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(8);
  const memberJoinInput = {
    email: email,
    password: RandomGenerator.alphaNumeric(16),
    username: username,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: memberJoinInput,
  });
  typia.assert(authorizedMember);
  // 2. Initialize member profile with identity details
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  const profileCreateInput = {
    display_name: displayName,
    bio: bio,
  } satisfies IREdditLikeCommunityProfile.ICreate;
  const createdProfile =
    await generate_random_reddit_like_community_member_profile_create(
      memberConnection,
      { body: profileCreateInput },
    );
  typia.assert(createdProfile);
  // 3. Unauthenticated guest retrieves profile using base connection (no auth headers set)
  // The base connection has no Authorization header, simulating a guest
  const guestConnection: api.IConnection = { host: connection.host };
  const retrievedProfile =
    await api.functional.redditLikeCommunity.community_profiles.at(
      guestConnection,
      {
        profileId: createdProfile.id,
      },
    );
  typia.assert(retrievedProfile);
  // 4. Validate returned profile data
  TestValidator.equals(
    "display name matches initialized data",
    retrievedProfile.display_name,
    displayName,
  );
  TestValidator.equals(
    "bio matches initialized data",
    retrievedProfile.bio,
    bio,
  );
  TestValidator.equals(
    "member id matches",
    retrievedProfile.member.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "member username matches",
    retrievedProfile.member.username,
    username,
  );
  TestValidator.equals(
    "member email matches",
    retrievedProfile.member.email,
    email,
  );
  TestValidator.predicate(
    "profile has created_at timestamp",
    typeof retrievedProfile.created_at === "string",
  );
  TestValidator.predicate(
    "profile has updated_at timestamp",
    typeof retrievedProfile.updated_at === "string",
  );
  TestValidator.equals(
    "deleted_at is null for active profile",
    retrievedProfile.deleted_at,
    null,
  );
}
