import { ICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community hub report creation data for E2E testing.
 *
 * Generates a complete ICommunityHubReport.ICreate with randomized values for
 * filing a content report against a post or comment. The target_type randomly
 * selects between "post" and "comment", target_id generates a valid UUID, and
 * reason produces a non-empty paragraph text that satisfies the MinLength<1>
 * constraint.
 *
 * All properties can be overridden via the DeepPartial input parameter,
 * allowing test callers to specify exact target_type, target_id, or reason
 * values as needed for specific test scenarios such as reporting a known post,
 * testing duplicate reports, or validating reason length constraints.
 */
export function prepare_random_community_hub_report(
  input?: DeepPartial<ICommunityHubReport.ICreate>,
): ICommunityHubReport.ICreate {
  return {
    target_type:
      input?.target_type ?? RandomGenerator.pick(["post", "comment"] as const),
    target_id: input?.target_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
