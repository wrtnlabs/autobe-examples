import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit community comment creation data for E2E testing.
 *
 * Generates a complete IRedditCommunityComment.ICreate with randomized values.
 * Supports both top-level comments and reply comments through the optional
 * reddit_community_comment_id field.
 *
 * The content field generates realistic comment text using RandomGenerator.paragraph().
 * The reddit_community_comment_id field generates a UUID for reply scenarios by default,
 * but tests can explicitly set it to null for top-level comments.
 *
 * @param input Optional partial input for test-time customization
 * @returns Complete IRedditCommunityComment.ICreate object
 */
export function prepare_random_reddit_community_comment(
  input?: DeepPartial<IRedditCommunityComment.ICreate>,
): IRedditCommunityComment.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 15 }),
    reddit_community_comment_id:
      input?.reddit_community_comment_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
