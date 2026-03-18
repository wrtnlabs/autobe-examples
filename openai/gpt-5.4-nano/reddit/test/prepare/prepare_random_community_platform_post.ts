import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post(
  input?: DeepPartial<ICommunityPlatformPost.ICreate> | undefined,
): ICommunityPlatformPost.ICreate {
  return {
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    post_type: input?.post_type ?? RandomGenerator.alphabets(12),
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 2 }),
    body_text: input?.body_text ?? RandomGenerator.content({ paragraphs: 1 }),
    link: input?.link
      ? {
          href: input.link.href ?? typia.random<string & tags.Format<"uri">>(),
          display_title:
            input.link.display_title ??
            RandomGenerator.paragraph({ sentences: 1 }),
          display_description:
            input.link.display_description ??
            RandomGenerator.paragraph({ sentences: 2 }),
        }
      : undefined,
    image: input?.image
      ? {
          image_cover_url:
            input.image.image_cover_url ??
            typia.random<string & tags.Format<"uri">>(),
          image_alt_text:
            input.image.image_alt_text ??
            RandomGenerator.paragraph({ sentences: 1 }),
          attachments: input.image.attachments
            ? input.image.attachments.map((a) => ({
                file_url:
                  a.file_url ?? typia.random<string & tags.Format<"uri">>(),
                content_type:
                  a.content_type ??
                  RandomGenerator.pick([
                    "image/png",
                    "image/jpeg",
                    "image/webp",
                    "image/gif",
                  ] as const),
                file_size_bytes:
                  a.file_size_bytes ??
                  typia.random<number & tags.Type<"int32">>(),
                image_width_px:
                  a.image_width_px ??
                  typia.random<number & tags.Type<"int32">>(),
                image_height_px:
                  a.image_height_px ??
                  typia.random<number & tags.Type<"int32">>(),
                alt_text:
                  a.alt_text ?? RandomGenerator.paragraph({ sentences: 1 }),
                sort_order:
                  a.sort_order ?? typia.random<number & tags.Type<"int32">>(),
              }))
            : ArrayUtil.repeat(1, () => ({
                file_url: typia.random<string & tags.Format<"uri">>(),
                content_type: RandomGenerator.pick([
                  "image/png",
                  "image/jpeg",
                  "image/webp",
                  "image/gif",
                ] as const),
                file_size_bytes: typia.random<number & tags.Type<"int32">>(),
                image_width_px: typia.random<number & tags.Type<"int32">>(),
                image_height_px: typia.random<number & tags.Type<"int32">>(),
                alt_text: RandomGenerator.paragraph({ sentences: 1 }),
                sort_order: typia.random<number & tags.Type<"int32">>(),
              })),
        }
      : undefined,
  };
}
