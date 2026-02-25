import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post(
  input?: DeepPartial<ICommunityPlatformPost.ICreate>,
): ICommunityPlatformPost.ICreate {
  const post_type =
    input?.post_type ??
    RandomGenerator.pick(["text", "link", "image"] as const);
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    community_name: input?.community_name ?? RandomGenerator.alphabets(10),
    post_type: post_type,
    text_content:
      post_type === "text"
        ? (input?.text_content ?? RandomGenerator.content({ paragraphs: 2 }))
        : undefined,
    link_url:
      post_type === "link"
        ? (input?.link_url ?? typia.random<string & tags.Format<"uri">>())
        : undefined,
    image_url:
      post_type === "image"
        ? (input?.image_url ?? typia.random<string & tags.Format<"uri">>())
        : undefined,
    image_alt:
      post_type === "image"
        ? (input?.image_alt ?? RandomGenerator.paragraph({ sentences: 1 }))
        : undefined,
  };
}
