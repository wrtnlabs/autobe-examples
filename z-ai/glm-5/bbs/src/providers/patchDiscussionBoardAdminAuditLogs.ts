import { IDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminAuditLog";
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
  const whereInput = {
    ...(props.body.action !== undefined && { action: props.body.action }),
    ...(props.body.admin_id !== undefined && { admin_id: props.body.admin_id }),
    ...(props.body.member_id !== undefined && {
      member_id: props.body.member_id,
    }),
    ...(props.body.article_id !== undefined && {
      article_id: props.body.article_id,
    }),
    ...(props.body.comment_id !== undefined && {
      comment_id: props.body.comment_id,
    }),
    ...(props.body.section_id !== undefined && {
      section_id: props.body.section_id,
    }),
    ...(props.body.admin_request_id !== undefined && {
      admin_request_id: props.body.admin_request_id,
    }),
    ...(props.body.target_admin_id !== undefined && {
      target_admin_id: props.body.target_admin_id,
    }),
    ...((props.body.created_at_from !== undefined ||
      props.body.created_at_to !== undefined) && {
      created_at: {
        ...(props.body.created_at_from !== undefined && {
          gte: new Date(props.body.created_at_from),
        }),
        ...(props.body.created_at_to !== undefined && {
          lte: new Date(props.body.created_at_to),
        }),
      },
    }),
    ...(props.body.search !== undefined && {
      reason: { contains: props.body.search },
    }),
  } satisfies Prisma.discussion_board_admin_audit_logsWhereInput;
  const data = await MyGlobal.prisma.discussion_board_admin_audit_logs.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAdminAuditLogAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.discussion_board_admin_audit_logs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAdminAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
