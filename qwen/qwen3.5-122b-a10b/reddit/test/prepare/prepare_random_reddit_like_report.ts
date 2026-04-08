import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like report creation data for E2E testing.
 *
 * Generates a complete IRedditLikeReport.ICreate with randomized values for
 * testing content reporting functionality. The report specifies a target type
 * (post or comment), target ID, and reason for the violation report.
 *
 * @param input Optional partial input to override specific properties
 * @returns Complete IRedditLikeReport.ICreate object with all required fields
 */
export function prepare_random_reddit_like_report(
  input?: DeepPartial<IRedditLikeReport.ICreate>,
): IRedditLikeReport.ICreate {
  return {
    targetType:
      input?.targetType ?? RandomGenerator.pick(["post", "comment"] as const),
    targetId: input?.targetId ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
