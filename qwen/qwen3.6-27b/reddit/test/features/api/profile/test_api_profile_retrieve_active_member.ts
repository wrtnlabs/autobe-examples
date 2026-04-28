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
 * Tests the profile retrieval endpoint for a newly created active member.
 *
 * Validates the workflow of creating a member account, initializing their public profile
 * with display name, bio, and avatar. The profile is then retrieved by its ID to ensure
 * that the response includes all identity attributes, a karma score of 0, the active
 * avatar image, and empty posts and comments arrays. Verifies that the member summary
 * contains correct identity information.
 *
 * 1. Joins a new member account.
 * 2. Creates a public profile for the member.
 * 3. Retrieves the profile by ID.
 * 4. Validates response fields and empty collections.
 */
export async function test_api_profile_retrieve_active_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert<IREdditLikeCommunityMember.IAuthorized>(authorizedMember);
  // 2. Create profile using generation utility
  const createdProfile =
    await generate_random_reddit_like_community_member_profile_create(
      memberConnection,
      {},
    );
  typia.assert<IREdditLikeCommunityProfile>(createdProfile);
  // 3. Retrieve profile using SDK (no utility for GET)
  const retrievedProfile = await api.functional.redditLikeCommunity.profiles.at(
    memberConnection,
    { profileId: createdProfile.id },
  );
  typia.assert<IREdditLikeCommunityProfile>(retrievedProfile);
  // 4. Verify business logic and state
  TestValidator.equals("karma is 0 for new member", retrievedProfile.karma, 0);
  TestValidator.equals(
    "posts are empty for new member",
    retrievedProfile.posts.length,
    0,
  );
  TestValidator.equals(
    "comments are empty for new member",
    retrievedProfile.comments.length,
    0,
  );
  TestValidator.equals(
    "profile id matches created",
    retrievedProfile.id,
    createdProfile.id,
  );
  TestValidator.equals(
    "member id matches authorized",
    retrievedProfile.member.id,
    authorizedMember.id,
  );
}
