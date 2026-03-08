import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post(
  input?: DeepPartial<ICommunityPlatformPost.ICreate>,
): ICommunityPlatformPost.ICreate {
  const contentType =
    input?.contentType ??
    RandomGenerator.pick(["text", "link", "image"] as const);
  return {
    communityId:
      input?.communityId ?? typia.random<string & tags.Format<"uuid">>(),
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    contentType: contentType,
    textContent:
      contentType === "text"
        ? (input?.textContent ?? RandomGenerator.content({ paragraphs: 2 }))
        : null,
    linkUrl:
      contentType === "link"
        ? (input?.linkUrl ?? typia.random<string & tags.Format<"uri">>())
        : null,
    imageUrl:
      contentType === "image"
        ? (input?.imageUrl ?? typia.random<string & tags.Format<"uri">>())
        : null,
  };
}
