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

export async function getDiscussionBoardSuperAdminAdminRolesRoleId(props: {
  superAdmin: SuperadminPayload;
  roleId: string;
}): Promise<IDiscussionBoardAdminsRole> {
  const role = await MyGlobal.prisma.discussion_board_admins_roles.findUnique({
    where: { id: props.roleId },
  });
  if (!role) {
    throw new HttpException("Role not found", 404);
  }
  return {
    id: role.id,
    user_id: role.user_id,
    granted_by_id: role.granted_by_id === null ? undefined : role.granted_by_id,
    grade: role.grade,
  };
}
