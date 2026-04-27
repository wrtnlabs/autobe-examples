import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community platform report creation data for E2E testing.
 *
 * Generates a complete ICommunityPlatformReport.ICreate with randomized values.
 * The report includes a free-text violation reason, a content type discriminator
 * indicating whether the target is a post or comment, and a UUID referencing the
 * target content. All properties can be overridden via the optional input
 * parameter for test-specific scenarios.
 *
 * @param input - Partial overrides for any report property (DeepPartial)
 * @returns A fully populated ICommunityPlatformReport.ICreate
 */
export function prepare_random_community_platform_report(
  input?: DeepPartial<ICommunityPlatformReport.ICreate>,
): ICommunityPlatformReport.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
    targetType:
      input?.targetType ?? RandomGenerator.pick(["post", "comment"] as const),
    targetId: input?.targetId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
