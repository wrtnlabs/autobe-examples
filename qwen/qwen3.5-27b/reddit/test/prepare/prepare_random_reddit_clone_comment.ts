import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit clone comment creation data for E2E testing.
 *
 * Generates a complete IRedditCloneComment.ICreate with randomized values.
 * The content field contains realistic comment text, and parentCommentId
 * can be optionally provided to create replies to existing comments.
 * By default, generates top-level comments (parentCommentId = null).
 */
export function prepare_random_reddit_clone_comment(
  input?: DeepPartial<IRedditCloneComment.ICreate> | undefined,
): IRedditCloneComment.ICreate {
  return {
    content: input?.content ?? RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: input?.parentCommentId ?? null,
  };
}
