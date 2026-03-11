import { IDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardStatusEnumSnapshotCollector {
  export async function collect(props: {
    body: IDiscussionBoardStatusEnumSnapshot.ICreate;
    statusEnum: IEntity; // from path parameter statusEnumId
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      snapshot_name: props.body.snapshotName,
      description: props.body.description ?? null,
      snapshot_reason: props.body.snapshotReason ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation
      statusEnum: { connect: { id: props.statusEnum.id } },
      // HasMany relation omitted - not applicable for creation from this side
    } satisfies Prisma.discussion_board_status_enum_snapshotsCreateInput;
  }
}
