import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like community moderator creation data for E2E testing.
 *
 * Generates a complete IRedditLikeCommunityModerator.ICreate with randomized values.
 * The member_id property specifies which member will be appointed as moderator
 * in the target community (identified by the path parameter).
 *
 * @param input Optional partial input to override specific properties
 * @returns Complete IRedditLikeCommunityModerator.ICreate object
 */
export function prepare_random_reddit_like_community_moderator(
  input?: DeepPartial<IRedditLikeCommunityModerator.ICreate>,
): IRedditLikeCommunityModerator.ICreate {
  return {
    member_id: input?.member_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
