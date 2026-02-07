import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post(
  input?: DeepPartial<ICommunityPlatformPost.ICreate>,
): ICommunityPlatformPost.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    content_type: RandomGenerator.pick(["text", "link", "image"] as const),
    textContent:
      input?.content_type === "text"
        ? (input?.textContent ?? RandomGenerator.paragraph({ sentences: 3 }))
        : undefined,
    url:
      input?.content_type === "link"
        ? (input?.url ??
          typia.random<string & tags.MaxLength<2000> & tags.Format<"uri">>())
        : undefined,
    imageUrl:
      input?.content_type === "image"
        ? (input?.imageUrl ??
          typia.random<string & tags.MaxLength<2000> & tags.Format<"uri">>())
        : undefined,
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
