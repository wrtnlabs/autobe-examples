import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformCommentFileTransformer {
  export type Payload = Prisma.community_platform_comment_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        comment: {
          select: {},
        } satisfies Prisma.community_platform_commentsFindManyArgs,
        original_name: true,
        mime_type: true,
        storage_key: true,
        size: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        snapshotFiles: {
          select: {},
        } satisfies Prisma.community_platform_comment_snapshot_filesFindManyArgs,
      },
    } satisfies Prisma.community_platform_comment_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentFile> {
    return {
      id: input.id,
      comment: {} satisfies ICommunityPlatformComment.ISummary,
      original_name: input.original_name,
      mime_type: input.mime_type,
      storage_key: input.storage_key,
      size: input.size,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
