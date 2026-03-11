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

export async function deleteDiscussionBoardSuperAdminStatusEnumsStatusEnumId(props: {
  superAdmin: SuperadminPayload;
  statusEnumId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if status enum exists and is not already deleted
  const statusEnum =
    await MyGlobal.prisma.discussion_board_status_enums.findUniqueOrThrow({
      where: { id: props.statusEnumId },
    });
  // Check if already deleted
  if (statusEnum.deleted_at !== null) {
    throw new HttpException("Status enumeration value already deleted", 400);
  }
  // Check if status enum is inactive (additional validation)
  if (!statusEnum.is_active) {
    throw new HttpException(
      "Cannot delete inactive status enumeration value",
      400,
    );
  }
  // Check for active references (status enum references)
  const activeReferences =
    await MyGlobal.prisma.discussion_board_status_enum_references.count({
      where: {
        statusEnum: { id: props.statusEnumId },
        deleted_at: null,
      },
    });
  if (activeReferences > 0) {
    throw new HttpException(
      "Cannot delete status enumeration value with active references",
      400,
    );
  }
  // Perform soft deletion with proper ISO string format
  await MyGlobal.prisma.discussion_board_status_enums.update({
    where: { id: props.statusEnumId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
