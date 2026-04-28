import api from "@ORGANIZATION/PROJECT-api";
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

import { prepare_random_reddit_like_community_profile } from "../prepare/prepare_random_reddit_like_community_profile";

/**
 * Generate a random reddit-like community member profile for E2E testing.
 *
 * Prepares random profile data using the prepare function, then calls the member profile
 * initialization endpoint to create the authenticated member's public identity profile.
 * The profile includes display name, bio text, and optional avatar image.
 *
 * This generation function is for testing purposes only and should not be used in production.
 */
export async function generate_random_reddit_like_community_member_profile_create(
  connection: api.IConnection,
  props?: {
    body?: DeepPartial<IREdditLikeCommunityProfile.ICreate>;
  },
): Promise<IREdditLikeCommunityProfile> {
  const prepared: IREdditLikeCommunityProfile.ICreate =
    prepare_random_reddit_like_community_profile(props?.body);
  const result: IREdditLikeCommunityProfile =
    await api.functional.redditLikeCommunity.member.profile.create(connection, {
      body: prepared,
    });
  return result;
}