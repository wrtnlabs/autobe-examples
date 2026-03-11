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

export async function deleteDiscussionBoardSuperAdminSystemMetadataMetadataId(props: {
  superAdmin: SuperadminPayload;
  metadataId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    // Verify superAdmin authorization
    const superAdmin =
      await MyGlobal.prisma.discussion_board_super_admins.findFirst({
        where: {
          id: props.superAdmin.id,
          deleted_at: null,
        },
      });
    if (!superAdmin) {
      throw new HttpException("Super administrator not found or inactive", 403);
    }
    // Check if the system metadata record exists
    const existingMetadata =
      await MyGlobal.prisma.discussion_board_system_metadata.findUnique({
        where: { id: props.metadataId },
      });
    if (!existingMetadata) {
      throw new HttpException("System metadata record not found", 404);
    }
    // Perform hard deletion
    await MyGlobal.prisma.discussion_board_system_metadata.delete({
      where: { id: props.metadataId },
    });
    // Log the deletion action in audit logs with proper string datetime
    const auditLogId = v4() as string & tags.Format<"uuid">;
    const currentTimestamp = toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">;
    await MyGlobal.prisma.discussion_board_system_audit_logs.create({
      data: {
        id: auditLogId,
        actor_type: "SUPER_ADMIN",
        action_category: "SYSTEM_METADATA",
        action_type: "DELETE_SYSTEM_METADATA",
        action_description: `System metadata '${existingMetadata.name}' deleted by super administrator`,
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
      },
    });
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    // Handle database errors with proper type checking
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new HttpException("System metadata record not found", 404);
    }
    throw new HttpException("Internal server error", 500);
  }
}
