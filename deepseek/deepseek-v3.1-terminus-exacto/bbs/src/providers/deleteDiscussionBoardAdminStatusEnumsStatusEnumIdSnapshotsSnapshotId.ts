import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminStatusEnumsStatusEnumIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify the status enumeration exists
    const statusEnum = await tx.discussion_board_status_enums.findUnique({
      where: { id: props.statusEnumId, deleted_at: null },
    });
    if (!statusEnum) {
      throw new HttpException("Status enumeration not found", 404);
    }
    // Verify the snapshot exists and belongs to the specified status enumeration
    const snapshot = await tx.discussion_board_status_enum_snapshots.findUnique(
      {
        where: { id: props.snapshotId },
      },
    );
    if (!snapshot) {
      throw new HttpException("Status enumeration snapshot not found", 404);
    }
    if (snapshot.discussion_board_status_enum_id !== props.statusEnumId) {
      throw new HttpException(
        "Snapshot does not belong to the specified status enumeration",
        403,
      );
    }
    // Delete metadata records first (cascade delete)
    await tx.discussion_board_status_enum_snapshot_metadata.deleteMany({
      where: { discussion_board_status_enum_snapshot_id: props.snapshotId },
    });
    // Delete the main snapshot record (hard deletion)
    await tx.discussion_board_status_enum_snapshots.delete({
      where: { id: props.snapshotId },
    });
    // Log the deletion action for audit purposes
    // This would typically involve creating an audit log entry
    // Example: await createAuditLog({ action: 'DELETE_SNAPSHOT', adminId: props.admin.id, snapshotId: props.snapshotId });
  });
}
