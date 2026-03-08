import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAuditLogAtSummaryTransformer } from "../transformers/DiscussionBoardAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAuditLogsAnalytics(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_audit_logsWhereInput = {
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.resource_type && {
      resource_type: props.body.resource_type,
    }),
    ...(props.body.resource_id && { resource_id: props.body.resource_id }),
    ...(props.body.member_id !== undefined && {
      member_id: props.body.member_id,
    }),
    ...(props.body.admin_id !== undefined && { admin_id: props.body.admin_id }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: props.body.created_at_from,
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: props.body.created_at_to,
      },
    }),
  };
  const orderByInput: Prisma.discussion_board_audit_logsOrderByWithRelationInput =
    props.body.sort_by === "created_at"
      ? { created_at: props.body.sort_order ?? "desc" }
      : { created_at: "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_audit_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardAuditLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_audit_logs.count({ where: whereInput }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardAuditLog.ISummary;
}
