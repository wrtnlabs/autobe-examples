import { IDiscussionBoardAdminsRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRole";
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

export async function patchDiscussionBoardSuperAdminAdminRolesUserIdDemoteSuper(props: {
  superAdmin: SuperadminPayload;
  userId: string;
  body: IDiscussionBoardAdminsRole.IUpdate;
}): Promise<IDiscussionBoardAdminsRole> {
  // Verify the user's admin role exists and is currently super grade
  const roleRecord =
    await MyGlobal.prisma.discussion_board_admins_roles.findFirst({
      where: {
        user_id: props.userId,
        grade: "super",
      },
      select: {
        id: true,
        user_id: true,
        granted_by_id: true,
        grade: true,
      },
    });
  if (!roleRecord) {
    throw new HttpException("User not found or not a super admin", 404);
  }
  // Update the grade to regular
  const updatedRole =
    await MyGlobal.prisma.discussion_board_admins_roles.update({
      where: { id: roleRecord.id },
      data: {
        grade: "regular",
      },
      select: {
        id: true,
        user_id: true,
        granted_by_id: true,
        grade: true,
      },
    });
  // Return the updated role record with required fields
  return {
    id: updatedRole.id,
    user_id: updatedRole.user_id,
    granted_by_id: updatedRole.granted_by_id,
    grade: updatedRole.grade,
    created_at: toISOStringSafe(new Date()),
    updated_at: toISOStringSafe(new Date()),
  };
}
