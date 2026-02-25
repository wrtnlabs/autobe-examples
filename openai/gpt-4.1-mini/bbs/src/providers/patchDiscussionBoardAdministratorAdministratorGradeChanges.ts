import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_administrator_grade_changesWhereInput = {
    deleted_at: null,
    ...(props.body.discussionBoardAdministratorId && {
      discussion_board_administrator_id:
        props.body.discussionBoardAdministratorId,
    }),
    ...(props.body.discussionBoardAdministratorGradeId && {
      discussion_board_administrator_grade_id:
        props.body.discussionBoardAdministratorGradeId,
    }),
    ...(props.body.createdAtFrom && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
    ...(props.body.updatedAtFrom && {
      updated_at: { gte: new Date(props.body.updatedAtFrom) },
    }),
    ...(props.body.updatedAtTo && {
      updated_at: { lte: new Date(props.body.updatedAtTo) },
    }),
  };
  const dataRecords =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          administrator: {
            select: {
              id: true,
              email: true,
              grade: {
                select: {
                  id: true,
                  name: true,
                },
              },
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          grade: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
      },
    );
  const totalRecords =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.count({
      where,
    });
  function toDateTimeString(
    date: Date | null,
  ): (string & tags.Format<"date-time">) | null {
    if (date === null) return null;
    return toISOStringSafe(date);
  }
  const data = dataRecords.map((record) => {
    const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
      record.created_at,
    );
    const updatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
      record.updated_at,
    );
    const deletedAt: (string & tags.Format<"date-time">) | null =
      toDateTimeString(record.deleted_at);
    const adminCreatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
      record.administrator.created_at,
    );
    const adminUpdatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
      record.administrator.updated_at,
    );
    const adminDeletedAt: (string & tags.Format<"date-time">) | null =
      toDateTimeString(record.administrator.deleted_at);
    return {
      id: record.id,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: deletedAt,
      administrator: {
        id: record.administrator.id,
        email: record.administrator.email,
        grade: {
          id: record.administrator.grade.id,
          name: record.administrator.grade.name,
        },
        created_at: adminCreatedAt,
        updated_at: adminUpdatedAt,
        deleted_at: adminDeletedAt,
      },
      grade: {
        id: record.grade.id,
        name: record.grade.name,
        level: record.grade.level,
      },
    };
  });
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
  };
}
