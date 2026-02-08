import { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
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

export async function getDiscussionBoardAdministratorAdministratorGradeChangesGradeChangeId(props: {
  administrator: AdministratorPayload;
  gradeChangeId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorGradeChange> {
  const result =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.findUnique(
      {
        where: { id: props.gradeChangeId },
        select: {
          id: true,
          discussion_board_administrator_id: true,
          discussion_board_administrator_grade_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (result === null) throw new HttpException("Grade change not found", 404);
  // Fetch administrator separately
  const admin =
    await MyGlobal.prisma.discussion_board_administrators.findUnique({
      where: { id: result.discussion_board_administrator_id },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (admin === null) throw new HttpException("Administrator not found", 404);
  // Fetch grade separately
  const grade =
    await MyGlobal.prisma.discussion_board_administrator_grades.findUnique({
      where: { id: result.discussion_board_administrator_grade_id },
      select: {
        id: true,
        level: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (grade === null) throw new HttpException("Grade not found", 404);
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    result.created_at,
  );
  const updatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    result.updated_at,
  );
  const deletedAt: (string & tags.Format<"date-time">) | null =
    result.deleted_at === null ? null : toISOStringSafe(result.deleted_at);
  const adminCreatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    admin.created_at,
  );
  const adminUpdatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    admin.updated_at,
  );
  const adminDeletedAt: (string & tags.Format<"date-time">) | null =
    admin.deleted_at === null ? null : toISOStringSafe(admin.deleted_at);
  const gradeCreatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    grade.created_at,
  );
  const gradeUpdatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    grade.updated_at,
  );
  const gradeDeletedAt: (string & tags.Format<"date-time">) | null =
    grade.deleted_at === null ? null : toISOStringSafe(grade.deleted_at);
  return {
    id: result.id,
    administrator_id: result.discussion_board_administrator_id,
    grade_id: result.discussion_board_administrator_grade_id,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: deletedAt,
    administrator: {
      id: admin.id,
      created_at: adminCreatedAt,
      updated_at: adminUpdatedAt,
      deleted_at: adminDeletedAt,
    },
    grade: {
      id: grade.id,
      level: grade.level,
      created_at: gradeCreatedAt,
      updated_at: gradeUpdatedAt,
      deleted_at: gradeDeletedAt,
    },
  };
}
