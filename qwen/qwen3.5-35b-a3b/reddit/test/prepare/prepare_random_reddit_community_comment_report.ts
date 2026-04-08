import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit community comment report creation data for E2E testing.
 *
 * Generates a complete IRedditCommunityCommentReport.ICreate with randomized
 * reason field suitable for submission to the report endpoint. The reason
 * field contains a meaningful explanation for why a comment is being reported,
 * constrained to 1-500 characters as required by the API.
 *
 * @param input Optional partial input for test customization
 * @returns Complete IRedditCommunityCommentReport.ICreate object with random reason
 */
export function prepare_random_reddit_community_comment_report(
  input?: DeepPartial<IRedditCommunityCommentReport.ICreate>,
): IRedditCommunityCommentReport.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
