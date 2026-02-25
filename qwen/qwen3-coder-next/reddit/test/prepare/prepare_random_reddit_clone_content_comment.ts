import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_content_comment(
  input?: DeepPartial<IRedditCloneContentComment.ICreate> | undefined,
): IRedditCloneContentComment.ICreate {
  return {
    postId: input?.postId ?? typia.random<string & tags.Format<"uuid">>(),
    parentId:
      input?.parentId ??
      (Math.random() > 0.5
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
    content:
      input?.content ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 15 }),
  };
}
