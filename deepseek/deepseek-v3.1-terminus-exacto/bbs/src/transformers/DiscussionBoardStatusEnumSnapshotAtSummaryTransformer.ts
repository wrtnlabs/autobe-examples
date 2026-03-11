import { IDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardStatusEnumSnapshotAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_status_enum_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_name: true,
        description: true,
        snapshot_reason: true,
        created_at: true,
      },
    } satisfies Prisma.discussion_board_status_enum_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardStatusEnumSnapshot.ISummary> {
    return {
      id: input.id,
      snapshot_name: input.snapshot_name,
      description: input.description ?? null,
      snapshot_reason: input.snapshot_reason ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
