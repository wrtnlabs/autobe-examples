import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardAdministratorGradeTransformer } from "../transformers/DiscussionBoardAdministratorGradeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorAdministratorGrades(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAdministratorGrade.IUpdate;
}): Promise<IDiscussionBoardAdministratorGrade> {
  // Authorization check: fetch caller's administrator grade level
  const callerAdmin =
    await MyGlobal.prisma.discussion_board_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: {
        grade: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
    });
  // Fetch super admin grade info
  const superAdminGrade =
    await MyGlobal.prisma.discussion_board_administrator_grades.findUniqueOrThrow(
      {
        where: { name: "super" },
      },
    );
  if (callerAdmin.grade.level < superAdminGrade.level) {
    throw new HttpException(
      "Forbidden: Only super administrators may update grades.",
      403,
    );
  }
  // Fetch grade to update - assuming the update targets the grade record itself identified by body.name (unique)
  if (!props.body.name) {
    throw new HttpException("Grade name is required for update.", 400);
  }
  const gradeToUpdate =
    await MyGlobal.prisma.discussion_board_administrator_grades.findUnique({
      where: { name: props.body.name },
    });
  if (!gradeToUpdate) {
    throw new HttpException("Grade to update not found.", 404);
  }
  // Prevent self-demotion: caller cannot demote themselves by reducing their own grade level
  if (callerAdmin.grade.id === gradeToUpdate.id) {
    if (
      props.body.level !== undefined &&
      props.body.level < callerAdmin.grade.level
    ) {
      throw new HttpException(
        "Forbidden: Super administrators cannot demote themselves.",
        403,
      );
    }
  }
  // Update grade record
  await MyGlobal.prisma.discussion_board_administrator_grades.update({
    where: { id: gradeToUpdate.id },
    data: {
      ...(props.body.name !== undefined ? { name: props.body.name } : {}),
      ...(props.body.description !== undefined
        ? { description: props.body.description }
        : {}),
      ...(props.body.level !== undefined ? { level: props.body.level } : {}),
      updated_at: new Date(),
    },
  });
  // Fetch fully loaded grade with all relations
  const fullUpdatedGrade =
    await MyGlobal.prisma.discussion_board_administrator_grades.findUniqueOrThrow(
      {
        where: { id: gradeToUpdate.id },
        include: {
          gradeChanges: true,
          administrators: true,
          oldGradePromotions: true,
          newGradePromotions: true,
        },
      },
    );
  // DO NOT convert Dates to strings here, pass raw Prisma Dates to transformer
  return await DiscussionBoardAdministratorGradeTransformer.transform(
    fullUpdatedGrade,
  );
}
