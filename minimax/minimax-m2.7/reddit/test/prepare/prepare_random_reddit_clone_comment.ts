import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_comment(
  input?: DeepPartial<IRedditCloneComment.ICreate>,
): IRedditCloneComment.ICreate {
  return {
    content: input?.content ?? RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: input?.parentCommentId,
  };
}
