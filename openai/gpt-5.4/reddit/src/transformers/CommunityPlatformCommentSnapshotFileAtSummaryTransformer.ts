import { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import { ICommunityPlatformCommentSnapshotFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshotFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentFileAtSummaryTransformer } from "./CommunityPlatformCommentFileAtSummaryTransformer";

export namespace CommunityPlatformCommentSnapshotFileAtSummaryTransformer {
  export type Payload =
    Prisma.community_platform_comment_snapshot_filesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        commentFile: CommunityPlatformCommentFileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_comment_snapshot_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentSnapshotFile.ISummary> {
    return {
      id: input.id,
      commentFile:
        await CommunityPlatformCommentFileAtSummaryTransformer.transform(
          input.commentFile,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
