import { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardStatusEnumSnapshotTransformer } from "../transformers/DiscussionBoardStatusEnumSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminStatusEnumsStatusEnumIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IDiscussionBoardStatusEnumSnapshot.IUpdate;
}): Promise<IDiscussionBoardStatusEnumSnapshot> {
  // Import the transformer (will be added at top of file)
  // import { DiscussionBoardStatusEnumSnapshotTransformer } from "../transformers/DiscussionBoardStatusEnumSnapshotTransformer";

  // 1. Verify parent status enumeration exists, is active, and not deleted
  await MyGlobal.prisma.discussion_board_status_enums.findUniqueOrThrow({
    where: {
      id: props.statusEnumId,
      is_active: true,
      deleted_at: null,
    },
  });
  // 2. Verify snapshot exists, belongs to parent enum, and is not deleted
  const snapshot =
    await MyGlobal.prisma.discussion_board_status_enum_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          discussion_board_status_enum_id: props.statusEnumId,
          deleted_at: null,
        },
        select: { id: true },
      },
    );
  // 3. Build type-safe update data using Prisma types
  const updateData: Prisma.discussion_board_status_enum_snapshotsUpdateInput =
    {};
  if (props.body.snapshot_name !== undefined) {
    updateData.snapshot_name = props.body.snapshot_name;
  }
  if (props.body.description !== undefined) {
    updateData.description =
      props.body.description === null ? null : props.body.description;
  }
  if (props.body.snapshot_reason !== undefined) {
    updateData.snapshot_reason =
      props.body.snapshot_reason === null ? null : props.body.snapshot_reason;
  }
  // Always update updated_at timestamp
  updateData.updated_at = new Date();
  // 4. Perform the update
  await MyGlobal.prisma.discussion_board_status_enum_snapshots.update({
    where: { id: props.snapshotId },
    data: updateData,
  });
  // 5. Fetch updated snapshot with transformer select
  const updatedSnapshot =
    await MyGlobal.prisma.discussion_board_status_enum_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...DiscussionBoardStatusEnumSnapshotTransformer.select(),
      },
    );
  // 6. Transform and return
  return await DiscussionBoardStatusEnumSnapshotTransformer.transform(
    updatedSnapshot,
  );
}
