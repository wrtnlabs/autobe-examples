import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionAdminLog";
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

export async function patchDiscussionBoardSuperAdministratorSectionAdminLogs(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardSectionAdminLog.IRequest;
}): Promise<IPageIDiscussionBoardSectionAdminLog.ISummary> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const createdAtFilter =
    props.body.createdAtGte !== undefined ||
    props.body.createdAtLte !== undefined
      ? {
          ...(props.body.createdAtGte !== undefined
            ? { gte: props.body.createdAtGte }
            : {}),
          ...(props.body.createdAtLte !== undefined
            ? { lte: props.body.createdAtLte }
            : {}),
        }
      : undefined;
  const where = {
    ...(props.body.administratorId !== undefined
      ? { administrator_id: props.body.administratorId }
      : {}),
    ...(props.body.sectionId !== undefined
      ? { section_id: props.body.sectionId }
      : {}),
    ...(props.body.actionType !== undefined
      ? { action_type: props.body.actionType }
      : {}),
    ...(createdAtFilter !== undefined ? { created_at: createdAtFilter } : {}),
  } satisfies Prisma.discussion_board_section_admin_logsWhereInput;
  const skip = (page - 1) * limit;
  const records =
    await MyGlobal.prisma.discussion_board_section_admin_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        action_type: true,
        note: true,
        created_at: true,
        updated_at: true,
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
        section: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  const total = await MyGlobal.prisma.discussion_board_section_admin_logs.count(
    { where },
  );
  const toSafeDateString = (
    date: Date | string | null | undefined,
  ): string & tags.Format<"date-time"> => {
    if (date === null || date === undefined)
      return "" as string & tags.Format<"date-time">;
    if (typeof date === "string")
      return date as string & tags.Format<"date-time">;
    return date.toISOString() as string & tags.Format<"date-time">;
  };
  const data = records.map((record) => ({
    id: record.id,
    actionType: record.action_type,
    note: record.note ?? undefined,
    createdAt: toSafeDateString(record.created_at),
    updatedAt: toSafeDateString(record.updated_at),
    administrator: {
      id: record.administrator.id,
      email: record.administrator.email,
      grade: {
        id: record.administrator.grade.id,
        name: record.administrator.grade.name,
        level: record.administrator.grade.level,
      },
      created_at: toSafeDateString(record.administrator.created_at),
      updated_at: toSafeDateString(record.administrator.updated_at),
      deleted_at: toSafeDateString(record.administrator.deleted_at),
    },
    section: {
      id: record.section.id,
      name: record.section.name,
      description: record.section.description,
      created_at: toSafeDateString(record.section.created_at),
      updated_at: toSafeDateString(record.section.updated_at),
      deleted_at: toSafeDateString(record.section.deleted_at),
    },
  }));
  const pages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
  };
}
