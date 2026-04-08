import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit platform report creation data for E2E testing.
 *
 * Generates a complete IRedditPlatformReport.ICreate with randomized values
 * suitable for testing content moderation reporting functionality.
 *
 * - `reason`: Violation description text explaining why content is being reported
 * - `target_id`: UUID of the post or comment being reported
 * - `target_type`: Discriminator indicating whether reporting a 'post' or 'comment'
 */
export function prepare_random_reddit_platform_report(
  input?: DeepPartial<IRedditPlatformReport.ICreate> | undefined,
): IRedditPlatformReport.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
    target_id: input?.target_id ?? typia.random<string & tags.Format<"uuid">>(),
    target_type:
      input?.target_type ?? RandomGenerator.pick(["post", "comment"] as const),
  };
}
