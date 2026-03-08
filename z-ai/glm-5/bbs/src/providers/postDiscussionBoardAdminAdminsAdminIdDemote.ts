import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdminTransformer } from "../transformers/DiscussionBoardAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminAdminsAdminIdDemote(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdmin> {
  // 1. Verify current admin is super administrator
  const currentAdmin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      id: props.admin.id,
      grade: "super",
      deleted_at: null,
      banned_at: null,
    },
  });
  if (currentAdmin === null) {
    throw new HttpException(
      "Forbidden: Only super administrators can demote",
      403,
    );
  }
  // 2. Self-demotion prevention
  if (props.adminId === props.admin.id) {
    throw new HttpException("Cannot demote yourself", 400);
  }
  // 3. Verify target admin exists and is super
  const targetAdmin = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { id: props.adminId },
  });
  if (targetAdmin === null || targetAdmin.deleted_at !== null) {
    throw new HttpException("Target administrator not found", 404);
  }
  if (targetAdmin.grade !== "super") {
    throw new HttpException("Target is not a super administrator", 400);
  }
  // 4. Check at least one super admin will remain
  const superAdminCount = await MyGlobal.prisma.discussion_board_admins.count({
    where: {
      grade: "super",
      deleted_at: null,
      banned_at: null,
    },
  });
  if (superAdminCount <= 1) {
    throw new HttpException(
      "Cannot demote: system must maintain at least one active super administrator",
      400,
    );
  }
  // 5. Execute demotion in transaction
  const [updatedAdmin] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_admins.update({
      where: { id: props.adminId },
      data: {
        grade: "regular",
        updated_at: new Date(),
      },
      ...DiscussionBoardAdminTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_administrator_grade_histories.create({
      data: {
        id: v4(),
        admin_id: props.adminId,
        acted_by: props.admin.id,
        action: "demotion",
        previous_grade: "super",
        new_grade: "regular",
        created_at: new Date(),
      },
    }),
  ]);
  // 6. Return transformed result
  return await DiscussionBoardAdminTransformer.transform(updatedAdmin);
}
