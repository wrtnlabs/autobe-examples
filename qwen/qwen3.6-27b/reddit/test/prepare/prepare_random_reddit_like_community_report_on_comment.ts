import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like community report on comment creation data for E2E testing.
 *
 * Generates a complete IREdditLikeCommunityReportOnComment.ICreate with randomized values.
 *
 * The report links an existing comment as its target content for moderator review,
 * establishing the polymorphic relationship for the reporting system. The comment_id
 * is generated as a valid UUID format string.
 *
 * @param input - Optional DeepPartial input for test-time customization
 * @returns Complete IREdditLikeCommunityReportOnComment.ICreate with generated values
 */
export function prepare_random_reddit_like_community_report_on_comment(
  input?: DeepPartial<IREdditLikeCommunityReportOnComment.ICreate>,
): IREdditLikeCommunityReportOnComment.ICreate {
  return {
    comment_id:
      input?.comment_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
