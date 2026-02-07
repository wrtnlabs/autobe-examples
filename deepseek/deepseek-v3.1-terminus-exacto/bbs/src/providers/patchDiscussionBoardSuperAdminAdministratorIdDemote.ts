import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorPromotionApprovalTransformer } from "../transformers/DiscussionBoardAdministratorPromotionApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministratorIdDemote(props: {
  superAdmin: SuperadminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorPromotionApproval.IDemote;
}): Promise<IDiscussionBoardAdministratorPromotionApproval> {
  // Verify the requesting super admin exists
  const requestingSuperAdmin =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: {
        id: props.superAdmin.id,
        deleted_at: null,
      },
    });
  if (!requestingSuperAdmin) {
    throw new HttpException("Super administrator not found", 404);
  }
  // Verify the target administrator exists and is currently a super administrator
  const targetAdministrator =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: {
        id: props.administratorId,
        grade: "super",
        is_active: true,
        deleted_at: null,
      },
      ...DiscussionBoardAdministratorPromotionApprovalTransformer.select(),
    });
  if (!targetAdministrator) {
    throw new HttpException(
      "Target administrator not found or not a super administrator",
      404,
    );
  }
  // Prevent self-demotion
  if (targetAdministrator.superAdmin?.id === props.superAdmin.id) {
    throw new HttpException("Cannot demote yourself", 400);
  }
  // Create grade change record
  const gradeChangeId = v4();
  await MyGlobal.prisma.discussion_board_administrator_grade_changes.create({
    data: {
      id: gradeChangeId,
      administrator_id: props.administratorId,
      old_grade: "super",
      new_grade: "regular",
      reason: props.body.reason,
      changed_by_administrator_id: props.superAdmin.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Update the administrator's grade
  const updatedAdministrator =
    await MyGlobal.prisma.discussion_board_administrators.update({
      where: {
        id: props.administratorId,
      },
      data: {
        grade: "regular",
        grade_changed_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      ...DiscussionBoardAdministratorPromotionApprovalTransformer.select(),
    });
  return await DiscussionBoardAdministratorPromotionApprovalTransformer.transform(
    updatedAdministrator,
  );
}
