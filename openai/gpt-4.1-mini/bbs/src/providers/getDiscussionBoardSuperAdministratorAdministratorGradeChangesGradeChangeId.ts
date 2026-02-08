import { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
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

export async function getDiscussionBoardSuperAdministratorAdministratorGradeChangesGradeChangeId(props: {
  superAdministrator: SuperadministratorPayload;
  gradeChangeId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorGradeChange> {
  const record =
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
          administrator: {
            select: {
              id: true,
              grade_id: true,
              email: true,
              password_hash: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              grade: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  level: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
          grade: {
            select: {
              id: true,
              name: true,
              description: true,
              level: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    );
  if (!record) throw new HttpException("Grade change not found", 404);
  return {
    id: record.id,
    discussion_board_administrator_id: record.discussion_board_administrator_id,
    discussion_board_administrator_grade_id:
      record.discussion_board_administrator_grade_id,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    administrator: {
      id: record.administrator.id,
      grade_id: record.administrator.grade_id,
      email: record.administrator.email,
      password_hash: record.administrator.password_hash,
      created_at: toISOStringSafe(record.administrator.created_at),
      updated_at: toISOStringSafe(record.administrator.updated_at),
      deleted_at: record.administrator.deleted_at
        ? toISOStringSafe(record.administrator.deleted_at)
        : null,
      grade: {
        id: record.administrator.grade.id,
        name: record.administrator.grade.name,
        description: record.administrator.grade.description,
        level: record.administrator.grade.level,
        created_at: toISOStringSafe(record.administrator.grade.created_at),
        updated_at: toISOStringSafe(record.administrator.grade.updated_at),
        deleted_at: record.administrator.grade.deleted_at
          ? toISOStringSafe(record.administrator.grade.deleted_at)
          : null,
      },
    },
    grade: {
      id: record.grade.id,
      name: record.grade.name,
      description: record.grade.description,
      level: record.grade.level,
      created_at: toISOStringSafe(record.grade.created_at),
      updated_at: toISOStringSafe(record.grade.updated_at),
      deleted_at: record.grade.deleted_at
        ? toISOStringSafe(record.grade.deleted_at)
        : null,
    },
  };
}
