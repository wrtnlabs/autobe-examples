import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminAuditLog";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdminAuditLogAtSummaryTransformer } from "../transformers/DiscussionBoardAdminAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdminAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAdminAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_admin_audit_logsWhereInput = {
    ...(props.body.admin_id !== undefined && {
      admin: { id: props.body.admin_id },
    }),
    ...(props.body.action_type !== undefined && {
      action_type: props.body.action_type,
    }),
    ...(props.body.target_entity !== undefined && {
      target_entity: props.body.target_entity,
    }),
    ...(props.body.target_id !== undefined &&
      props.body.target_id !== null && { target_id: props.body.target_id }),
    ...(props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null && {
        created_at: { gte: new Date(props.body.created_at_from) },
      }),
    ...(props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null && {
        created_at: { lte: new Date(props.body.created_at_to) },
      }),
  };
  const sortParts = (props.body.sort ?? "created_at DESC").split(" ");
  const sortField = sortParts[0] ?? "created_at";
  const sortDirection = (
    (sortParts[1] ?? "DESC").toLowerCase() === "asc" ? "asc" : "desc"
  ) as "asc" | "desc";
  const orderByInput: Prisma.discussion_board_admin_audit_logsOrderByWithRelationInput =
    {
      [sortField]: sortDirection,
    };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admin_audit_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardAdminAuditLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_admin_audit_logs.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAdminAuditLogAtSummaryTransformer.transform,
    ),
  };
}
