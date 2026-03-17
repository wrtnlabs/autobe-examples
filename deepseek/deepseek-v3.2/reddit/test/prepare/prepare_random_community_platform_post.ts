import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post(
  input?: DeepPartial<ICommunityPlatformPost.ICreate> | undefined,
): ICommunityPlatformPost.ICreate {
  const content_type =
    input?.content_type ??
    RandomGenerator.pick(["TEXT", "LINK", "IMAGE"] as const);
  // Handle content_text generation
  const content_text = (() => {
    if (content_type === "TEXT" || input?.content_text !== undefined) {
      return {
        content:
          input?.content_text?.content ??
          RandomGenerator.content({ paragraphs: 2 }),
        formatting: input?.content_text?.formatting ?? "plain",
      };
    }
    return undefined;
  })();
  // Handle content_link generation
  const content_link = (() => {
    if (content_type === "LINK" || input?.content_link !== undefined) {
      const thumbnail_url = input?.content_link?.thumbnail_url;
      return {
        url:
          input?.content_link?.url ??
          typia.random<string & tags.MaxLength<80000> & tags.Format<"url">>(),
        title:
          input?.content_link?.title ??
          RandomGenerator.paragraph({ sentences: 2 }),
        description:
          input?.content_link?.description ??
          RandomGenerator.content({ paragraphs: 1 }),
        thumbnail_url:
          thumbnail_url !== undefined
            ? thumbnail_url
            : typia.random<
                string & tags.MaxLength<80000> & tags.Format<"url">
              >(),
      };
    }
    return undefined;
  })();
  // Handle content_attachment generation
  const content_attachment = (() => {
    if (content_type === "IMAGE" || input?.content_attachment !== undefined) {
      return {
        position:
          input?.content_attachment?.position ??
          typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        file_type:
          input?.content_attachment?.file_type ??
          RandomGenerator.pick([
            "image",
            "document",
            "video",
            "audio",
          ] as const),
        original_filename:
          input?.content_attachment?.original_filename ??
          `${RandomGenerator.alphabets(10)}.${RandomGenerator.pick(["jpg", "png", "pdf", "mp4", "mp3"] as const)}`,
        file_size:
          input?.content_attachment?.file_size ??
          typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<10000000>
          >(),
        mime_type:
          input?.content_attachment?.mime_type ??
          RandomGenerator.pick([
            "image/jpeg",
            "image/png",
            "application/pdf",
            "video/mp4",
            "audio/mpeg",
          ] as const),
        community_platform_file_id:
          input?.content_attachment?.community_platform_file_id ??
          typia.random<string & tags.Format<"uuid">>(),
      };
    }
    return undefined;
  })();
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    community_name:
      input?.community_name ?? typia.random<string & tags.Format<"uuid">>(),
    content_type,
    content_text,
    content_link,
    content_attachment,
  };
}
