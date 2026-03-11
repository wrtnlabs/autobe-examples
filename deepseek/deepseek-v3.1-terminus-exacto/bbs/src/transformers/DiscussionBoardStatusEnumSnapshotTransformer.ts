import { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardStatusEnumAtSummaryTransformer } from "./DiscussionBoardStatusEnumAtSummaryTransformer";

export namespace DiscussionBoardStatusEnumSnapshotTransformer {
  // 1. Payload type first
  export type Payload = Prisma.discussion_board_status_enum_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        snapshot_name: true,
        description: true,
        snapshot_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        statusEnum: DiscussionBoardStatusEnumAtSummaryTransformer.select(),
        snapshotMetadata: {
          select: {
            id: true,
            key: true,
            value: true,
          },
        } satisfies Prisma.discussion_board_status_enum_snapshot_metadataFindManyArgs,
      },
    } satisfies Prisma.discussion_board_status_enum_snapshotsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardStatusEnumSnapshot> {
    return {
      id: input.id,
      snapshot_name: input.snapshot_name,
      description: input.description ?? undefined,
      snapshot_reason: input.snapshot_reason ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      statusEnum: await DiscussionBoardStatusEnumAtSummaryTransformer.transform(
        input.statusEnum,
      ),
    };
  }
}
