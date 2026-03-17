import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_post(
  input?: DeepPartial<IRedditLikePost.ICreate>,
): IRedditLikePost.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    post_type:
      input?.post_type ??
      RandomGenerator.pick(["text", "link", "image"] as const),
    body: input?.body ?? RandomGenerator.content({ paragraphs: 3 }),
    excerpt:
      input?.excerpt ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 15 }),
    url: input?.url ?? typia.random<string & tags.Format<"uri">>(),
    attachment_id:
      input?.attachment_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
