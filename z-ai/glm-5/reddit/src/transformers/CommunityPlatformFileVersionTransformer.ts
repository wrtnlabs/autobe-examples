import { ICommunityPlatformFileVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileVersion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformFileVersionTransformer {
  export type Payload = Prisma.community_platform_file_versionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        version_type: true,
        path: true,
        width: true,
        height: true,
        file_size: true,
        created_at: true,
      },
    } satisfies Prisma.community_platform_file_versionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFileVersion> {
    return {
      id: input.id,
      versionType:
        input.version_type as ICommunityPlatformFileVersion["versionType"],
      url: input.path,
      width: input.width,
      height: input.height,
      fileSize: input.file_size,
      createdAt: input.created_at.toISOString(),
    };
  }
}
