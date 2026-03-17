import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
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
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 4 }),
    community_platform_community_id:
      input?.community_platform_community_id ??
      typia.random<string & tags.Format<"uuid">>(),
    post_type,
    textContent: input?.textContent
      ? {
          body:
            input.textContent.body ??
            RandomGenerator.content({ paragraphs: 2 }),
        }
      : post_type === "text"
        ? {
            body: RandomGenerator.content({ paragraphs: 2 }),
          }
        : undefined,
    link: input?.link
      ? {
          target_url:
            input.link.target_url ??
            typia.random<string & tags.Format<"uri">>(),
        }
      : post_type === "link"
        ? {
            target_url: typia.random<string & tags.Format<"uri">>(),
          }
        : undefined,
    postImage: input?.postImage
      ? {
          storage_uri:
            input.postImage.storage_uri ??
            typia.random<string & tags.Format<"uri">>(),
          original_name:
            input.postImage.original_name ??
            `${RandomGenerator.alphaNumeric(12)}.jpg`,
          mime_type:
            input.postImage.mime_type ??
            RandomGenerator.pick([
              "image/jpeg",
              "image/png",
              "image/webp",
            ] as const),
          byte_size:
            input.postImage.byte_size ??
            typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
          width:
            input.postImage.width !== undefined
              ? input.postImage.width
              : typia.random<number & tags.Type<"int32">>(),
          height:
            input.postImage.height !== undefined
              ? input.postImage.height
              : typia.random<number & tags.Type<"int32">>(),
        }
      : post_type === "image"
        ? {
            storage_uri: typia.random<string & tags.Format<"uri">>(),
            original_name: `${RandomGenerator.alphaNumeric(12)}.jpg`,
            mime_type: RandomGenerator.pick([
              "image/jpeg",
              "image/png",
              "image/webp",
            ] as const),
            byte_size: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            width: typia.random<number & tags.Type<"int32">>(),
            height: typia.random<number & tags.Type<"int32">>(),
          }
        : undefined,
  };
}
