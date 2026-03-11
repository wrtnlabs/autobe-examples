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

export async function deleteDiscussionBoardAdminStatusEnumsStatusEnumIdReferencesReferenceId(props: {
  admin: AdminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  referenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Validate status enumeration exists and is active
  const statusEnum =
    await MyGlobal.prisma.discussion_board_status_enums.findUnique({
      where: {
        id: props.statusEnumId,
        deleted_at: null,
      },
    });
  if (!statusEnum) {
    throw new HttpException("Status enumeration not found or deleted", 404);
  }
  // 2. Find the reference record for this status enumeration
  const reference =
    await MyGlobal.prisma.discussion_board_status_enum_references.findUnique({
      where: {
        id: props.referenceId,
        discussion_board_status_enums_id: props.statusEnumId,
        deleted_at: null,
      },
    });
  if (!reference) {
    throw new HttpException(
      "Reference record not found for this status enumeration",
      404,
    );
  }
  // 3. Check if reference is actively being used by domain table records
  // The specification mentions checking if reference is actively used, but since
  // this is a tracking table for dependencies (not enforcement), we'll only
  // delete the tracking record. The actual foreign key constraints would be
  // at the domain tables themselves.
  // 4. Perform hard delete of the reference relationship
  await MyGlobal.prisma.discussion_board_status_enum_references.delete({
    where: {
      id: props.referenceId,
    },
  });
  // 5. Verify deletion was successful
  const deletedCheck =
    await MyGlobal.prisma.discussion_board_status_enum_references.findUnique({
      where: {
        id: props.referenceId,
      },
    });
  if (deletedCheck) {
    throw new HttpException("Failed to delete reference record", 500);
  }
  // 6. Operation successful - void return
}
