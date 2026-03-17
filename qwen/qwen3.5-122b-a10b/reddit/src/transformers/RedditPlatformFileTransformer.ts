import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformFileTransformer {
  export type Payload = Prisma.reddit_platform_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        owner_type: true,
        owner_id: true,
        file_name: true,
        file_path: true,
        content_type: true,
        file_size: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        memberAvatars: true,
        communityIcons: true,
        postAttachments: true,
      },
    } satisfies Prisma.reddit_platform_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformFile> {
    return {
      id: input.id,
      fileName: input.file_name,
      filePath: input.file_path,
      contentType: input.content_type,
      fileSize: input.file_size,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
