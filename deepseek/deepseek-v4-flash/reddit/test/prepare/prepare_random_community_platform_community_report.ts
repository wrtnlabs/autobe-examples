import { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community report submission data for E2E testing.
 *
 * Generates a complete ICommunityPlatformCommunityReport.ICreate with randomized
 * values for post or comment reporting. The result is fully customizable via the
 * optional DeepPartial input parameter.
 *
 * By default, targetId is a random UUID, targetType is randomly chosen between
 * "post" and "comment", and reason is a short 2-sentence paragraph. Callers can
 * override any or all of these by passing partial input.
 *
 * @param input Partial report data to override default random values
 * @returns A fully populated report creation DTO
 */
export function prepare_random_community_platform_community_report(
  input?: DeepPartial<ICommunityPlatformCommunityReport.ICreate> | undefined,
): ICommunityPlatformCommunityReport.ICreate {
  return {
    targetId: input?.targetId ?? typia.random<string & tags.Format<"uuid">>(),
    targetType:
      input?.targetType ?? RandomGenerator.pick(["post", "comment"] as const),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
