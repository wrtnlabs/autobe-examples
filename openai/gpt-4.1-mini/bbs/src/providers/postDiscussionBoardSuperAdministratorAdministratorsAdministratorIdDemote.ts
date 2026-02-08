import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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

export async function postDiscussionBoardSuperAdministratorAdministratorsAdministratorIdDemote(props: {
  superAdministrator: SuperadministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministrator> {
  if (props.administratorId === props.superAdministrator.id) {
    throw new HttpException("Cannot demote yourself", 403);
  }
  const admin =
    await MyGlobal.prisma.discussion_board_administrators.findUnique({
      where: { id: props.administratorId },
      include: { grade: true },
    });
  if (!admin) {
    throw new HttpException("Administrator not found", 404);
  }
  const currentGrade =
    await MyGlobal.prisma.discussion_board_administrator_grades.findUnique({
      where: { id: admin.grade_id },
    });
  if (!currentGrade) {
    throw new HttpException("Current grade not found", 404);
  }
  const lowerGrade =
    await MyGlobal.prisma.discussion_board_administrator_grades.findFirst({
      where: { level: { gt: currentGrade.level } },
      orderBy: { level: "asc" },
    });
  if (!lowerGrade) {
    throw new HttpException("No lower grade available for demotion", 400);
  }
  const now = toISOStringSafe(new Date());
  const updatedAdmin =
    await MyGlobal.prisma.discussion_board_administrators.update({
      where: { id: props.administratorId },
      data: { grade_id: lowerGrade.id },
      include: { grade: true },
    });
  await MyGlobal.prisma.discussion_board_administrator_promotions.create({
    data: {
      id: v4(),
      administrator: { connect: { id: props.administratorId } },
      oldGrade: { connect: { id: currentGrade.id } },
      newGrade: { connect: { id: lowerGrade.id } },
      promoted_at: null,
      demoted_at: now,
    },
  });
  return updatedAdmin;
}
