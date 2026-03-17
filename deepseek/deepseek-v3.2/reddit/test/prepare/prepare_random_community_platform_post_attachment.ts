import { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_attachment(
  input?: DeepPartial<ICommunityPlatformPostAttachment.ICreate> | undefined,
): ICommunityPlatformPostAttachment.ICreate {
  // Generate file_type first as other properties depend on it
  const file_type: string =
    input?.file_type ??
    RandomGenerator.pick(["image", "document", "video", "audio"] as const);
  // Define mappings inline
  const mimeTypeMap: Record<string, string[]> = {
    image: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ],
    document: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/rtf",
    ],
    video: ["video/mp4", "video/webm", "video/ogg", "video/quicktime"],
    audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/aac"],
  };
  const filenamePartsMap: Record<
    string,
    {
      prefixes: string[];
      extensions: string[];
    }
  > = {
    image: {
      prefixes: ["photo", "image", "picture", "snapshot", "capture"],
      extensions: ["jpg", "jpeg", "png", "gif", "webp", "svg"],
    },
    document: {
      prefixes: ["document", "file", "report", "paper", "article"],
      extensions: ["pdf", "doc", "docx", "txt", "rtf"],
    },
    video: {
      prefixes: ["video", "clip", "recording", "movie"],
      extensions: ["mp4", "webm", "ogg", "mov"],
    },
    audio: {
      prefixes: ["audio", "recording", "sound", "track"],
      extensions: ["mp3", "wav", "ogg", "webm", "aac"],
    },
  };
  
  return {
    position:
      input?.position ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10>
      >(),
    file_type: file_type,
    original_filename:
      input?.original_filename ??
      (() => {
        const parts = filenamePartsMap[file_type];
        const prefix = RandomGenerator.pick(parts.prefixes);
        const extension = RandomGenerator.pick(parts.extensions);
        const randomNumber = typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>
        >();
        return `${prefix}_${randomNumber}.${extension}`;
      })(),
    file_size:
      input?.file_size ??
      (() => {
        switch (file_type) {
          case "image":
            return typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<10_485_760>
            >();
          case "document":
            return typia.random<
              number & tags.Type<"int32"> & tags.Minimum<512> & tags.Maximum<52_428_800>
            >();
          case "video":
            return typia.random<
              number & tags.Type<"int32"> & tags.Minimum<102_400> & tags.Maximum<524_288_000>
            >();
          case "audio":
            return typia.random<
              number & tags.Type<"int32"> & tags.Minimum<10_240> & tags.Maximum<104_857_600>
            >();
          default:
            // Fallback for unexpected file_type
            return typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<10_485_760>
            >();
        }
      })(),
    mime_type: input?.mime_type ?? RandomGenerator.pick(mimeTypeMap[file_type]),
    community_platform_file_id:
      input?.community_platform_file_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
