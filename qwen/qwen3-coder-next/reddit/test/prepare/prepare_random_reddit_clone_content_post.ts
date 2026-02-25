import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_content_post(
  input?: DeepPartial<IRedditCloneContentPost.ICreate>,
): IRedditCloneContentPost.ICreate {
  return {
    type:
      input?.type ?? RandomGenerator.pick(["text", "link", "image"] as const),
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 1 }),
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    content:
      input?.content ??
      (input?.type === "text"
        ? RandomGenerator.content({ paragraphs: 2 })
        : null),
    url:
      input?.url ??
      (input?.type === "link"
        ? typia.random<string & tags.Format<"uri">>()
        : null),
    imageUrl:
      input?.imageUrl ??
      (input?.type === "image"
        ? typia.random<string & tags.Format<"uri">>()
        : null),
  };
}
