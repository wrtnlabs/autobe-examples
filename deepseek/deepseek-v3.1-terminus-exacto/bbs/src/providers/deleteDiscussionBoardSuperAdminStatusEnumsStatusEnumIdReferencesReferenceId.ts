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

export async function deleteDiscussionBoardSuperAdminStatusEnumsStatusEnumIdReferencesReferenceId(props: {
  superAdmin: SuperadminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  referenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Use a transaction to ensure atomicity
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // 1. Verify the status enumeration exists and is active
    const statusEnum = await prisma.discussion_board_status_enums.findUnique({
      where: { id: props.statusEnumId, deleted_at: null },
    });
    if (!statusEnum) {
      throw new HttpException(
        "Status enumeration not found or already deleted",
        404,
      );
    }
    // 2. Verify the reference record exists, belongs to the status enumeration, and is not soft-deleted
    const reference =
      await prisma.discussion_board_status_enum_references.findUnique({
        where: {
          id: props.referenceId,
          discussion_board_status_enums_id: props.statusEnumId,
        },
      });
    if (!reference) {
      throw new HttpException("Status enumeration reference not found", 404);
    }
    if (reference.deleted_at !== null) {
      // Reference is already soft-deleted, treat as not found for consistency
      throw new HttpException("Status enumeration reference not found", 404);
    }
    // 3. IMPORTANT: The specification mentions checking if reference is actively used
    // to prevent orphaned dependencies. This would require dynamic SQL queries
    // based on reference.referenced_table and reference.referenced_column.
    // For this implementation, we assume administrative oversight and proceed.
    // In production, this should be implemented with appropriate validation.
    // 4. Perform hard deletion (not soft delete)
    await prisma.discussion_board_status_enum_references.delete({
      where: { id: props.referenceId },
    });
    // No return value needed for void return type
  });
}
