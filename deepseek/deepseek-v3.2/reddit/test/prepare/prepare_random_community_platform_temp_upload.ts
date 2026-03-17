import { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_temp_upload(
  input?: DeepPartial<ICommunityPlatformTempUpload.ICreate>,
): ICommunityPlatformTempUpload.ICreate {
  return {
    communityPlatformFileId:
      input?.communityPlatformFileId ??
      typia.random<string & tags.Format<"uuid">>(),
    originalFilename:
      input?.originalFilename ??
      RandomGenerator.pick([
        "document.pdf",
        "image.jpg",
        "video.mp4",
        "archive.zip",
        "data.csv",
      ] as const),
    mimeType:
      input?.mimeType ??
      RandomGenerator.pick([
        "application/pdf",
        "image/jpeg",
        "image/png",
        "video/mp4",
        "text/plain",
        "application/zip",
      ] as const),
    fileSize:
      input?.fileSize ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
      >(),
    contentHash: input?.contentHash ?? RandomGenerator.alphabets(64),
    uploadIp: input?.uploadIp ?? typia.random<string & tags.Format<"ipv4">>(),
    userAgent:
      input?.userAgent ??
      RandomGenerator.pick([
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
      ] as const),
  };
}
