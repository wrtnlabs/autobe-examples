import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminStatusEnumsStatusEnumIdSnapshotsSnapshotId(props: {
  superAdmin: SuperadminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify parent status enumeration exists (authorization already verified by decorator)
  await MyGlobal.prisma.discussion_board_status_enums.findUniqueOrThrow({
    where: {
      id: props.statusEnumId,
      deleted_at: null, // Ensure active status enum
    },
  });
  // Verify snapshot exists and belongs to the specified status enumeration
  // Checking deleted_at ensures we don't operate on already soft-deleted records
  await MyGlobal.prisma.discussion_board_status_enum_snapshots.findUniqueOrThrow(
    {
      where: {
        id: props.snapshotId,
        discussion_board_status_enum_id: props.statusEnumId,
        deleted_at: null, // Ensure snapshot hasn't already been deleted
      },
    },
  );
  // Manual cascade deletion of metadata records
  // Even though database has onDelete: Cascade, we explicitly delete for clarity
  await MyGlobal.prisma.discussion_board_status_enum_snapshot_metadata.deleteMany(
    {
      where: {
        discussion_board_status_enum_snapshot_id: props.snapshotId,
      },
    },
  );
  // Hard deletion of the snapshot
  await MyGlobal.prisma.discussion_board_status_enum_snapshots.delete({
    where: {
      id: props.snapshotId,
    },
  });
}
