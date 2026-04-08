import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like comment creation data for E2E testing.
 *
 * Generates a complete IRedditLikeComment.ICreate with randomized values for testing comment functionality.
 *
 * @param input Optional partial input to override specific properties
 * @returns Complete IRedditLikeComment.ICreate object with all required fields
 */
export function prepare_random_reddit_like_comment(
  input?: DeepPartial<IRedditLikeComment.ICreate> | undefined,
): IRedditLikeComment.ICreate {
  return {
    content: input?.content ?? RandomGenerator.paragraph({ sentences: 3 }),
    parentId:
      input?.parentId ??
      (Math.random() < 0.5
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
  };
}
