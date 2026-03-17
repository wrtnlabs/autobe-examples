import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import { ICommunityPlatformCommentSnapshotFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshotFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentFileTransformer } from "./CommunityPlatformCommentFileTransformer";
import { CommunityPlatformCommentSnapshotTransformer } from "./CommunityPlatformCommentSnapshotTransformer";

export namespace CommunityPlatformCommentSnapshotFileTransformer {
  export type Payload =
    Prisma.community_platform_comment_snapshot_filesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        commentSnapshot: CommunityPlatformCommentSnapshotTransformer.select(),
        commentFile: CommunityPlatformCommentFileTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_comment_snapshot_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentSnapshotFile> {
    return {
      id: input.id,
      commentSnapshot:
        await CommunityPlatformCommentSnapshotTransformer.transform(
          input.commentSnapshot,
        ),
      commentFile: await CommunityPlatformCommentFileTransformer.transform(
        input.commentFile,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
