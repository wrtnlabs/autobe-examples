import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community_moderator } from "../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Generate a random Reddit-like community moderator assignment for E2E testing.
 *
 * Prepares random moderator assignment data using the prepare function, then calls the creation
 * endpoint to assign a member as a moderator in a community. The generated assignment
 * includes member ID and community ID references, with the authority type automatically
 * set to MODERATOR level.
 *
 * This function creates a new moderator record linking a registered member to a community
 * where they will exercise moderation authority. The operation validates that the
 * authenticated user has appropriate privileges and enforces composite unique
 * constraints to prevent duplicate assignments.
 *
 * @param connection - API connection for making the HTTP request
 * @param props - Optional partial input data for customizing the generated moderator assignment
 * @returns The newly created moderator assignment record with all populated fields
 */
export async function generate_random_reddit_like_community_member_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeCommunityModerator.ICreate> | undefined;
  },
): Promise<IRedditLikeCommunityModerator> {
  const prepared: IRedditLikeCommunityModerator.ICreate =
    prepare_random_reddit_like_community_moderator(props.body);
  const result: IRedditLikeCommunityModerator =
    await api.functional.redditLikeCommunity.member.moderators.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
