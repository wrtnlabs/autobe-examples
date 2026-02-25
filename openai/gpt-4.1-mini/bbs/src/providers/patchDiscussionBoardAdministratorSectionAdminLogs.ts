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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorSectionAdminLogs(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardSectionAdminLog.IRequest;
}): Promise<IPageIDiscussionBoardSectionAdminLog.ISummary> {
  const page =
    props.body.page !== undefined && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit !== undefined &&
    props.body.limit >= 1 &&
    props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_section_admin_logsWhereInput = {
    deleted_at: null,
    ...(props.body.administratorId
      ? { administrator_id: props.body.administratorId }
      : {}),
    ...(props.body.sectionId ? { section_id: props.body.sectionId } : {}),
    ...(props.body.actionType ? { action_type: props.body.actionType } : {}),
    ...(props.body.createdAtGte
      ? { created_at: { gte: props.body.createdAtGte } }
      : {}),
    ...(props.body.createdAtLte
      ? { created_at: { lte: props.body.createdAtLte } }
      : {}),
  };
  const data =
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
  const summaries = data.map((record) => {
    const note = record.note === undefined ? null : record.note;
    return {
      id: record.id,
      actionType: record.action_type,
      note,
      createdAt: toISOStringSafe(record.created_at) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      updatedAt: toISOStringSafe(record.updated_at) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      administrator: {
        id: record.administrator.id,
        email: record.administrator.email,
        created_at: toISOStringSafe(
          record.administrator.created_at,
        ) satisfies string & tags.Format<"date-time"> as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(
          record.administrator.updated_at,
        ) satisfies string & tags.Format<"date-time"> as string &
          tags.Format<"date-time">,
        deleted_at: record.administrator.deleted_at
          ? (toISOStringSafe(record.administrator.deleted_at) satisfies string &
              tags.Format<"date-time"> as string & tags.Format<"date-time">)
          : null,
        grade: {
          id: record.administrator.grade.id,
          name: record.administrator.grade.name,
          description: record.administrator.grade.description,
          level: record.administrator.grade.level,
        } satisfies IDiscussionBoardAdministratorGrade.ISummary,
      } satisfies IDiscussionBoardAdministrator.ISummary,
      section: {
        id: record.section.id,
        name: record.section.name,
        description: record.section.description,
        created_at: toISOStringSafe(
          record.section.created_at,
        ) satisfies string & tags.Format<"date-time"> as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(
          record.section.updated_at,
        ) satisfies string & tags.Format<"date-time"> as string &
          tags.Format<"date-time">,
        deleted_at: record.section.deleted_at
          ? (toISOStringSafe(record.section.deleted_at) satisfies string &
              tags.Format<"date-time"> as string & tags.Format<"date-time">)
          : null,
      } satisfies IDiscussionBoardSection.ISummary,
    } satisfies IDiscussionBoardSectionAdminLog.ISummary;
  });
  return {
    data: summaries,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
