import { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformCommentFileAtSummaryTransformer {
  export type Payload = Prisma.community_platform_comment_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        original_name: true,
        mime_type: true,
        storage_key: true,
        size: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.community_platform_comment_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentFile.ISummary> {
    return {
      id: input.id,
      original_name: input.original_name,
      mime_type: input.mime_type,
      storage_key: input.storage_key,
      size: input.size,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
