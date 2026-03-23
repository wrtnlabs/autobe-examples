import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_post(
  input?: DeepPartial<IRedditClonePost.ICreate>,
): IRedditClonePost.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    postType:
      input?.postType ??
      RandomGenerator.pick(["text", "link", "image"] as const),
    communityId:
      input?.communityId ?? typia.random<string & tags.Format<"uuid">>(),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 8,
      }),
  };
}
