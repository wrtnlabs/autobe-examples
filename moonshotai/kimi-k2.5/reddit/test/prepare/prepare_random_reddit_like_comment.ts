import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_comment(
  input?: DeepPartial<IRedditLikeComment.ICreate>,
): IRedditLikeComment.ICreate {
  return {
    content: input?.content ?? RandomGenerator.paragraph({ sentences: 2 }),
    parentId: input?.parentId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
