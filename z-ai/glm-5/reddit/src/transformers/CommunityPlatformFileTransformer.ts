import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformFileTransformer {
  export type Payload = Prisma.community_platform_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        owner_type: true,
        owner_id: true,
        path: true,
        size: true,
        mime_type: true,
        created_at: true,
      },
    } satisfies Prisma.community_platform_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFile> {
    return {
      id: input.id,
      ownerType: input.owner_type,
      ownerId: input.owner_id,
      path: input.path,
      size: input.size,
      mimeType: input.mime_type,
      createdAt: input.created_at.toISOString(),
    };
  }
}
