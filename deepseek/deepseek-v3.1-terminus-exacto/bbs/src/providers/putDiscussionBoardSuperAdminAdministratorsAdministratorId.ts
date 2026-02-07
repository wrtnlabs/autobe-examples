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

export async function putDiscussionBoardSuperAdminAdministratorsAdministratorId(props: {
  superAdmin: SuperadminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorPromotionApproval.IUpdate;
}): Promise<IDiscussionBoardAdministratorPromotionApproval> {
  // Verify administrator exists
  const existingAdmin =
    await MyGlobal.prisma.discussion_board_administrators.findUnique({
      where: { id: props.administratorId },
    });
  if (!existingAdmin) {
    throw new HttpException("Administrator not found", 404);
  }
  // Prepare update data with only provided fields
  const updateData: Prisma.discussion_board_administratorsUpdateInput = {
    updated_at: toISOStringSafe(new Date().toISOString()),
  };
  // Only update grade if provided and validate enum
  if (props.body.grade !== undefined) {
    if (props.body.grade !== "regular" && props.body.grade !== "super") {
      throw new HttpException("Invalid grade value", 400);
    }
    updateData.grade = props.body.grade;
    // Update grade_changed_at if grade is being modified
    if (props.body.grade !== existingAdmin.grade) {
      updateData.grade_changed_at = toISOStringSafe(new Date().toISOString());
    }
  }
  // Only update is_active if provided
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  // Perform update
  const updated = await MyGlobal.prisma.discussion_board_administrators.update({
    where: { id: props.administratorId },
    data: updateData,
    ...DiscussionBoardAdministratorPromotionApprovalTransformer.select(),
  });
  return await DiscussionBoardAdministratorPromotionApprovalTransformer.transform(
    updated,
  );
}
