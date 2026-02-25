import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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

export async function postDiscussionBoardSuperAdministratorAdministratorPromoteAdministratorId(props: {
  superAdministrator: SuperadministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministrator> {
  const now = toISOStringSafe(new Date());
  const admin =
    await MyGlobal.prisma.discussion_board_administrators.findUnique({
      where: { id: props.administratorId },
      select: { id: true, grade_id: true, deleted_at: true },
    });
  if (!admin || admin.deleted_at !== null) {
    throw new HttpException("Administrator not found", 404);
  }
  const regularGrade =
    await MyGlobal.prisma.discussion_board_administrator_grades.findFirst({
      where: { name: "administrator" },
    });
  const superGrade =
    await MyGlobal.prisma.discussion_board_administrator_grades.findFirst({
      where: { name: "superadministrator" },
    });
  if (!regularGrade || !superGrade) {
    throw new HttpException("Administrator grade configuration missing", 500);
  }
  if (admin.grade_id === superGrade.id) {
    throw new HttpException(
      "Administrator is already a super administrator",
      400,
    );
  }
  if (admin.grade_id !== regularGrade.id) {
    throw new HttpException("Administrator is not eligible for promotion", 400);
  }
  await MyGlobal.prisma.discussion_board_administrators.update({
    where: { id: admin.id },
    data: { grade_id: superGrade.id, updated_at: now },
  });
  await MyGlobal.prisma.discussion_board_administrator_promotions.create({
    data: {
      id: v4(),
      administrator: { connect: { id: admin.id } },
      oldGrade: { connect: { id: admin.grade_id } },
      newGrade: { connect: { id: superGrade.id } },
      promoted_by_super_administrator_id: props.superAdministrator.id,
      promoted_at: now,
    },
  });
  const updatedAdmin =
    await MyGlobal.prisma.discussion_board_administrators.findUniqueOrThrow({
      where: { id: admin.id },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        grade: {
          select: {
            id: true,
            name: true,
            description: true,
            level: true,
          },
        },
      },
    });
  return {
    id: updatedAdmin.id,
    email: updatedAdmin.email,
    createdAt: updatedAdmin.created_at.toISOString(),
    updatedAt: updatedAdmin.updated_at.toISOString(),
    deletedAt: updatedAdmin.deleted_at
      ? updatedAdmin.deleted_at.toISOString()
      : null,
    grade: updatedAdmin.grade
      ? {
          id: updatedAdmin.grade.id,
          name: updatedAdmin.grade.name,
          description: updatedAdmin.grade.description,
          level: updatedAdmin.grade.level,
        }
      : undefined,
  };
}
