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

export async function postDiscussionBoardAdminAdminsAdminIdPromote(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdmin.IPromote;
}): Promise<IDiscussionBoardAdmin> {
  // Step 1: Verify requester is super administrator
  const requester =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { id: true, grade: true },
    });
  if (requester.grade !== "super") {
    throw new HttpException(
      "Only super administrators can promote administrators",
      403,
    );
  }
  // Step 2: Fetch target administrator
  const target = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { id: props.adminId },
    select: {
      id: true,
      grade: true,
      banned_at: true,
      deleted_at: true,
    },
  });
  if (target === null || target.deleted_at !== null) {
    throw new HttpException("Administrator not found", 404);
  }
  // Step 3: Validate target is regular administrator
  if (target.grade !== "regular") {
    throw new HttpException(
      "Target administrator is already a super administrator",
      400,
    );
  }
  // Step 4: Validate not self-promotion
  if (target.id === props.admin.id) {
    throw new HttpException("Cannot promote yourself", 400);
  }
  // Step 5: Validate target is not banned
  if (target.banned_at !== null) {
    throw new HttpException("Cannot promote a banned administrator", 403);
  }
  // Step 6: Execute transaction
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_admins.update({
      where: { id: props.adminId },
      data: {
        grade: "super",
        updated_at: now,
      },
    }),
    MyGlobal.prisma.discussion_board_administrator_grade_histories.create({
      data: {
        id: v4(),
        admin_id: props.adminId,
        acted_by: props.admin.id,
        action: "promotion",
        previous_grade: "regular",
        new_grade: "super",
        created_at: now,
      },
    }),
  ]);
  // Step 7: Return updated administrator
  const updated =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { id: props.adminId },
      ...DiscussionBoardAdminTransformer.select(),
    });
  return await DiscussionBoardAdminTransformer.transform(updated);
}
