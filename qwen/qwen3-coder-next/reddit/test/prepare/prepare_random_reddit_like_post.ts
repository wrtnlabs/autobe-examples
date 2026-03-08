import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_post(
  input?: DeepPartial<IRedditLikePost.ICreate> | undefined,
): IRedditLikePost.ICreate {
  const postType =
    input?.type ?? RandomGenerator.pick(["text", "link", "image"] as const);
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    type: postType,
    content:
      postType === "text"
        ? (input?.content ?? RandomGenerator.content({ paragraphs: 2 }))
        : (input?.content ?? null),
    url:
      postType === "link"
        ? (input?.url ?? typia.random<string & tags.Format<"uri">>())
        : (input?.url ?? null),
    image_url:
      postType === "image"
        ? (input?.image_url ?? typia.random<string & tags.Format<"uri">>())
        : (input?.image_url ?? null),
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
