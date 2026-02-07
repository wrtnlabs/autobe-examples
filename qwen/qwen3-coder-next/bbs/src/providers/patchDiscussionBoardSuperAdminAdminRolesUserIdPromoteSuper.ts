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

export async function patchDiscussionBoardSuperAdminAdminRolesUserIdPromoteSuper(props: {
  superAdmin: SuperadminPayload;
  userId: string;
}): Promise<IDiscussionBoardAdminsRole> {
  // Verify the target user exists as a member
  const user = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  // Update or create admin role with super grade
  const adminRole = await MyGlobal.prisma.discussion_board_admins_roles.upsert({
    where: {
      user_id: props.userId,
    },
    update: {
      grade: "super",
      granted_by_id: props.superAdmin.id,
    },
    create: {
      id: v4(),
      user_id: props.userId,
      grade: "super",
      granted_by_id: props.superAdmin.id,
    },
  });
  // Return the updated admin role
  return {
    id: adminRole.id,
    user_id: adminRole.user_id,
    grade: adminRole.grade,
  };
}
