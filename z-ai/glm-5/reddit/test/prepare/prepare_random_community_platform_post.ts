import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post(
  input?: DeepPartial<ICommunityPlatformPost.ICreate>,
): ICommunityPlatformPost.ICreate {
  const postType =
    input?.postType ?? RandomGenerator.pick(["text", "link", "image"] as const);
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    postType,
    ...(postType === "text"
      ? {
          content:
            input?.content ??
            RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 5,
              sentenceMax: 10,
            }),
        }
      : {}),
    ...(postType === "link"
      ? { url: input?.url ?? typia.random<string & tags.Format<"url">>() }
      : {}),
    ...(postType === "image"
      ? {
          imageFileId:
            input?.imageFileId ?? typia.random<string & tags.Format<"uuid">>(),
        }
      : {}),
  };
}
