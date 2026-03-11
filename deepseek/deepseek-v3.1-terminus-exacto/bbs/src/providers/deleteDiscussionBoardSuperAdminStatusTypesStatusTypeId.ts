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

export async function deleteDiscussionBoardSuperAdminStatusTypesStatusTypeId(props: {
  superAdmin: SuperadminPayload;
  statusTypeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify status type exists and is not already deleted
  const statusType =
    await MyGlobal.prisma.discussion_board_status_types.findUnique({
      where: { id: props.statusTypeId },
      select: { id: true, deleted_at: true },
    });
  if (!statusType) {
    throw new HttpException("Status type not found", 404);
  }
  if (statusType.deleted_at !== null) {
    // Already deleted - idempotent operation
    return;
  }
  // Check for active dependencies
  const dependencies =
    await MyGlobal.prisma.discussion_board_status_enum_references.findMany({
      where: {
        discussion_board_status_enums_id: props.statusTypeId,
        deleted_at: null,
      },
      select: { referenced_table: true, referenced_column: true },
    });
  if (dependencies.length > 0) {
    const dependencyList = dependencies
      .map((d) => `${d.referenced_table}.${d.referenced_column}`)
      .join(", ");
    throw new HttpException(
      `Cannot delete status type: active dependencies exist in ${dependencyList}`,
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  // Perform soft deletion
  await MyGlobal.prisma.discussion_board_status_types.update({
    where: { id: props.statusTypeId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Record audit trail if audit logs table exists
  try {
    await MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "super_admin",
        actor_id: props.superAdmin.id,
        target_type: "discussion_board_status_types",
        target_id: props.statusTypeId,
        action_type: "status_type_deleted",
        action_details: `Status type ${props.statusTypeId} soft deleted by super admin`,
        created_at: now,
        updated_at: now,
      },
    });
  } catch (error) {
    // Audit log creation is optional - don't fail the main operation
    console.warn("Failed to create audit log:", error);
  }
}
