import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit community report creation data for E2E testing.
 *
 * Generates a complete IRedditCommunityReport.ICreate with randomized values for
 * filing content reports against posts or comments. The report_type determines
 * whether the target is a post or comment, target_id references the content being
 * reported, and reason provides the violation explanation.
 *
 * All properties support test-time customization through the DeepPartial input
 * parameter, allowing tests to override specific fields while auto-generating
 * the rest.
 *
 * @param input - Optional partial data for test customization
 * @returns Complete IRedditCommunityReport.ICreate object
 */
export function prepare_random_reddit_community_report(
  input?: DeepPartial<IRedditCommunityReport.ICreate>,
): IRedditCommunityReport.ICreate {
  return {
    report_type:
      input?.report_type ?? RandomGenerator.pick(["post", "comment"] as const),
    target_id: input?.target_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
