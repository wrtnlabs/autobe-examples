import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random reddit community report creation data for E2E testing.
 *
 * Generates a complete IRedditCommunityReport.ICreate with a randomized
 * reason field that explains why a post is being reported to moderators.
 */
export function prepare_random_reddit_community_report(
  input?: DeepPartial<IRedditCommunityReport.ICreate>,
): IRedditCommunityReport.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 8, wordMax: 12 }),
  };
}
