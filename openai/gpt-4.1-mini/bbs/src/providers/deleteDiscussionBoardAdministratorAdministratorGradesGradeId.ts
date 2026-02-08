import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdministratorAdministratorGradesGradeId(props: {
  administrator: AdministratorPayload;
  gradeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findUnique({
      where: { id: props.administrator.id },
      select: { grade_id: true },
    });
  if (!administrator) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if administrator is super administrator
  const superAdminGrade =
    await MyGlobal.prisma.discussion_board_administrator_grades.findFirst({
      where: {
        id: administrator.grade_id,
        name: "superadministrator",
        deleted_at: null,
      },
    });
  if (!superAdminGrade) {
    throw new HttpException("Forbidden", 403);
  }
  // Find the grade to delete, ensure it exists and not soft deleted
  const gradeToDelete =
    await MyGlobal.prisma.discussion_board_administrator_grades.findFirst({
      where: { id: props.gradeId, deleted_at: null },
    });
  if (!gradeToDelete) {
    throw new HttpException("Grade not found", 404);
  }
  await MyGlobal.prisma.discussion_board_administrator_grades.delete({
    where: { id: props.gradeId },
  });
  return;
}
