import { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeChange";
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

export async function patchDiscussionBoardAdministratorAdministratorGradeChanges(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAdministratorGradeChange.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorGradeChange.ISummary> {
  // Since IRequest has no page and limit, fallback to defaults.
  const body = props.body;
  const page = 1; // Default because page property does not exist
  const limit = 20; // Default because limit property does not exist
  // created_at_from and created_at_to assumed not present in IRequest, so undefined
  const createdAtFrom = undefined;
  const createdAtTo = undefined;
  const where: Prisma.discussion_board_administrator_grade_changesWhereInput = {
    deleted_at: null,
  };
  // No cursor, no administrator_id, no grade_id filters because missing
  const cursor = undefined;
  const data =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.findMany(
      {
        where,
        take: limit,
        cursor,
        orderBy: { created_at: "desc" },
        skip: 0,
        select: {
          id: true,
          discussion_board_administrator_id: true,
          discussion_board_administrator_grade_id: true,
          created_at: true,
          administrator: {
            select: {
              id: true,
            },
          },
          grade: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    );
  const total =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      administrator_id: record.discussion_board_administrator_id,
      grade_id: record.discussion_board_administrator_grade_id,
      created_at: toISOStringSafe(record.created_at),
      administrator: record.administrator
        ? {
            id: record.administrator.id,
          }
        : null,
      grade: record.grade
        ? {
            id: record.grade.id,
            name: record.grade.name,
          }
        : null,
    })),
  };
}
