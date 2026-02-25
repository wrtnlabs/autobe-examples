import { IDiscussionBoardDemotionResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDemotionResult";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdministratorAdministratorDemoteAdministratorId(props: {
  superAdministrator: SuperadministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardDemotionResult> {
  if (props.superAdministrator.id === props.administratorId) {
    throw new HttpException(
      "Super administrators cannot demote themselves.",
      403,
    );
  }
  const prisma = MyGlobal.prisma;
  const targetAdmin = await prisma.discussion_board_administrators.findUnique({
    where: { id: props.administratorId },
    select: { id: true, grade_id: true, deleted_at: true },
  });
  if (!targetAdmin || targetAdmin.deleted_at !== null) {
    throw new HttpException(
      "Target administrator not found or already deleted.",
      404,
    );
  }
  const [superAdminGrade, regularAdminGrade] = await Promise.all([
    prisma.discussion_board_administrator_grades.findUniqueOrThrow({
      where: { name: "super_administrator" },
    }),
    prisma.discussion_board_administrator_grades.findUniqueOrThrow({
      where: { name: "administrator" },
    }),
  ]);
  if (targetAdmin.grade_id !== superAdminGrade.id) {
    throw new HttpException(
      "Target administrator is not a super administrator.",
      403,
    );
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  await prisma.discussion_board_administrator_promotions.create({
    data: {
      id: v4(),
      administrator: { connect: { id: targetAdmin.id } },
      oldGrade: { connect: { id: superAdminGrade.id } },
      newGrade: { connect: { id: regularAdminGrade.id } },
      actedAdministrator: { connect: { id: props.superAdministrator.id } },
      promoted_at: now,
      created_at: now,
    },
  });
  await prisma.discussion_board_administrators.update({
    where: { id: targetAdmin.id },
    data: { grade_id: regularAdminGrade.id },
  });
  return { success: true };
}
