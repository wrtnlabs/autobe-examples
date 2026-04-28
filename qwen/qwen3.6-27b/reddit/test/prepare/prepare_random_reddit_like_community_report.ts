import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like community report creation data for E2E testing.
 *
 * Generates a complete IREdditLikeCommunityReport.ICreate with randomized values
 * for testing content reporting functionality. Randomizes the target identifier
 * (postId or commentId) and the report reason.
 *
 * The reporter is automatically identified from the authenticated member session
 * during actual API calls, and the system derives the community scope and target
 * type from the referenced content.
 *
 * @param input - Optional partial overrides for test customization
 * @returns Complete IREdditLikeCommunityReport.ICreate with generated values
 */
export function prepare_random_reddit_like_community_report(
  input?: DeepPartial<IREdditLikeCommunityReport.ICreate> | undefined,
): IREdditLikeCommunityReport.ICreate {
  return {
    postId: input?.postId ?? typia.random<string & tags.Format<"uuid">>(),
    commentId: input?.commentId ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
