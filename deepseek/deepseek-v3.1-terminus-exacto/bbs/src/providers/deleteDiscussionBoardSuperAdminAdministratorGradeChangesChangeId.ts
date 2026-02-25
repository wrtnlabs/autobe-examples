import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminAdministratorGradeChangesChangeId(props: {
  superAdmin: SuperAdminPayload;
  changeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, check if the grade change record exists and get its details to validate permissions
  const gradeChange =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.findUniqueOrThrow(
      {
        where: { id: props.changeId },
        select: {
          id: true,
          administrator_id: true,
          changed_by_administrator_id: true,
        },
      },
    );
  // Prevent super admin from deleting grade change records that pertain to their own account
  // This maintains the requirement that super administrators cannot manage their own administrator status
  if (gradeChange.administrator_id === props.superAdmin.id) {
    throw new HttpException(
      "Cannot delete grade change records for your own account",
      403,
    );
  }
  // Perform the deletion - cascade constraints will handle related records automatically
  await MyGlobal.prisma.discussion_board_administrator_grade_changes.delete({
    where: { id: props.changeId },
  });
  // Success - function returns void as per specification
  return;
}
