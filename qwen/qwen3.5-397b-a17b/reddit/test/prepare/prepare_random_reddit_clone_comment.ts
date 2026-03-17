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
    body: input?.body ?? RandomGenerator.paragraph({ sentences: 2 }),
    parent_comment_id:
      input?.parent_comment_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
