import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_post(
  input?: DeepPartial<IRedditPlatformPost.ICreate>,
): IRedditPlatformPost.ICreate {
  const post_type =
    input?.post_type ??
    RandomGenerator.pick(["text", "link", "image"] as const);
  return {
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    post_type: post_type,
    text_content:
      input?.text_content ??
      (post_type === "text"
        ? RandomGenerator.content({ paragraphs: 2 })
        : null),
    url:
      input?.url ??
      (post_type === "link"
        ? typia.random<string & tags.Format<"uri">>()
        : null),
    file_id:
      input?.file_id ??
      (post_type === "image"
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
  };
}
