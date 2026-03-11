import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_post(
  input?: DeepPartial<IRedditLikePost.ICreate> | undefined,
): IRedditLikePost.ICreate {
  const type =
    input?.type ?? RandomGenerator.pick(["text", "link", "image"] as const);
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    type: type,
    content:
      type === "text"
        ? (input?.content ?? RandomGenerator.content({ paragraphs: 2 }))
        : (input?.content ?? null),
    url:
      type === "link"
        ? (input?.url ?? typia.random<string & tags.Format<"uri">>())
        : (input?.url ?? null),
    image_url:
      type === "image"
        ? (input?.image_url ?? typia.random<string & tags.Format<"uri">>())
        : (input?.image_url ?? null),
  };
}
