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

export async function deleteDiscussionBoardAdminStatusTypesStatusTypeId(props: {
  admin: AdminPayload;
  statusTypeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if status type exists and is not already deleted
  const existingStatusType =
    await MyGlobal.prisma.discussion_board_status_types.findUnique({
      where: { id: props.statusTypeId },
      select: { id: true, deleted_at: true },
    });
  if (!existingStatusType) {
    throw new HttpException("Status type not found", 404);
  }
  if (existingStatusType.deleted_at !== null) {
    // Already deleted - idempotent return
    return;
  }
  // Check for active dependencies
  const activeDependencies =
    await MyGlobal.prisma.discussion_board_status_enum_references.findFirst({
      where: {
        discussion_board_status_enums_id: props.statusTypeId,
        deleted_at: null,
      },
      select: { id: true, referenced_table: true, referenced_column: true },
    });
  if (activeDependencies) {
    throw new HttpException(
      `Cannot delete status type: active dependencies exist in ${activeDependencies.referenced_table}.${activeDependencies.referenced_column}`,
      400,
    );
  }
  // Perform soft deletion
  const currentTimestamp = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_status_types.update({
    where: { id: props.statusTypeId },
    data: {
      deleted_at: currentTimestamp,
      updated_at: currentTimestamp,
    },
  });
  // Note: Audit trail recording would be implemented here if an audit logging system exists
  // This would typically involve creating a record in an audit log table
}
