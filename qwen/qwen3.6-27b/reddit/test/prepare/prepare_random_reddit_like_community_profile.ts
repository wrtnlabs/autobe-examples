import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random reddit-like community profile creation data for E2E testing.
 *
 * Generates a complete IREdditLikeCommunityProfile.ICreate value with randomized
 * display name, biographical text, and optional avatar image reference.
 *
 * - display_name: Optional human-readable display name for platform identification
 * - bio: Optional biographical text describing the user to the community
 * - avatar: Optional empty profile image creation object (all data uploaded via multipart)
 *
 * All fields are customizable through the input parameter using DeepPartial semantics.
 */
export function prepare_random_reddit_like_community_profile(
  input?: DeepPartial<IREdditLikeCommunityProfile.ICreate>,
): IREdditLikeCommunityProfile.ICreate {
  return {
    display_name: input?.display_name ?? RandomGenerator.name(),
    bio: input?.bio ?? RandomGenerator.paragraph({ sentences: 3 }),
    avatar: input?.avatar ?? {},
  };
}
