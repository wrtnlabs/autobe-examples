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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdministratorAdministratorGradeChanges(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardAdministratorGradeChange.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorGradeChange.ISummary> {
  const {
    discussionBoardAdministratorId,
    discussionBoardAdministratorGradeId,
    createdAtFrom,
    createdAtTo,
    updatedAtFrom,
    updatedAtTo,
    page = 1,
    limit = 100,
  } = props.body;
  const whereConditions: Prisma.discussion_board_administrator_grade_changesWhereInput =
    {
      deleted_at: null,
      ...(discussionBoardAdministratorId !== undefined
        ? { discussion_board_administrator_id: discussionBoardAdministratorId }
        : {}),
      ...(discussionBoardAdministratorGradeId !== undefined
        ? {
            discussion_board_administrator_grade_id:
              discussionBoardAdministratorGradeId,
          }
        : {}),
      ...(createdAtFrom !== undefined || createdAtTo !== undefined
        ? {
            created_at: {
              ...(createdAtFrom !== undefined ? { gte: createdAtFrom } : {}),
              ...(createdAtTo !== undefined ? { lte: createdAtTo } : {}),
            },
          }
        : {}),
      ...(updatedAtFrom !== undefined || updatedAtTo !== undefined
        ? {
            updated_at: {
              ...(updatedAtFrom !== undefined ? { gte: updatedAtFrom } : {}),
              ...(updatedAtTo !== undefined ? { lte: updatedAtTo } : {}),
            },
          }
        : {}),
    };
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.findMany(
      {
        where: whereConditions,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
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
                  level: true,
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
  const total =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.count({
      where: whereConditions,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(item.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(item.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at:
        item.deleted_at !== null && item.deleted_at !== undefined
          ? (toISOStringSafe(item.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
      administrator: {
        id: item.administrator.id as string & tags.Format<"uuid">,
        email: item.administrator.email,
        grade: {
          id: item.administrator.grade.id as string & tags.Format<"uuid">,
          name: item.administrator.grade.name,
          level: item.administrator.grade.level,
        },
        created_at: toISOStringSafe(item.administrator.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(item.administrator.updated_at) as string &
          tags.Format<"date-time">,
        deleted_at:
          item.administrator.deleted_at !== null &&
          item.administrator.deleted_at !== undefined
            ? (toISOStringSafe(item.administrator.deleted_at) as string &
                tags.Format<"date-time">)
            : null,
      },
      grade: {
        id: item.grade.id as string & tags.Format<"uuid">,
        name: item.grade.name,
        level: item.grade.level,
      },
    })),
  };
}
