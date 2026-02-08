import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
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

export async function patchDiscussionBoardSuperAdministratorAuditLogs(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
  const body = props.body as any;
  const page =
    body.page !== undefined && body.page !== null && body.page > 0
      ? body.page
      : 1;
  const limit =
    body.limit !== undefined && body.limit !== null && body.limit > 0
      ? body.limit
      : 100;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.discussion_board_audit_logsWhereInput = {};
  if (body.event_type !== undefined && body.event_type !== null) {
    whereClause.event_type = body.event_type;
  }
  if (body.actor_id !== undefined && body.actor_id !== null) {
    whereClause.actor_id = body.actor_id;
  }
  if (
    (body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
  ) {
    whereClause.created_at = {};
    if (body.created_at_from !== undefined && body.created_at_from !== null) {
      whereClause.created_at.gte = toISOStringSafe(body.created_at_from);
    }
    if (body.created_at_to !== undefined && body.created_at_to !== null) {
      whereClause.created_at.lte = toISOStringSafe(body.created_at_to);
    }
  }
  if (
    body.event_description !== undefined &&
    body.event_description !== null &&
    body.event_description.trim() !== ""
  ) {
    whereClause.event_description = {
      contains: body.event_description.trim(),
      mode: "insensitive",
    };
  }
  const data = await MyGlobal.prisma.discussion_board_audit_logs.findMany({
    where: whereClause,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.discussion_board_audit_logs.count({
    where: whereClause,
  });
  const transformedData: IDiscussionBoardAuditLog.ISummary[] = data.map(
    (record) => ({
      id: record.id,
      event_type: record.event_type,
      event_description: record.event_description,
      actor_id: record.actor_id === null ? null : record.actor_id,
      created_at: toISOStringSafe(record.created_at),
    }),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
