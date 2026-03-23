import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAdminAuditLog";
import { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { IRedditCloneAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCloneAdminAuditLogAtSummaryTransformer } from "../transformers/RedditCloneAdminAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IRedditCloneAdminAuditLog.IRequest;
}): Promise<IPageIRedditCloneAdminAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.reddit_clone_admin_id !== undefined && {
      reddit_clone_admin_id: props.body.reddit_clone_admin_id,
    }),
    ...(props.body.action_type !== undefined && {
      action_type: props.body.action_type,
    }),
    ...(props.body.target_type !== undefined && {
      target_type: props.body.target_type,
    }),
    ...(props.body.target_id !== undefined && {
      target_id: props.body.target_id,
    }),
    ...(props.body.from_date !== undefined && {
      created_at: {
        gte: new Date(props.body.from_date),
      },
    }),
    ...(props.body.to_date !== undefined && {
      created_at: {
        lte: new Date(props.body.to_date),
      },
    }),
    ...(props.body.ip_address !== undefined && {
      ip_address: props.body.ip_address,
    }),
    ...(props.body.search !== undefined && {
      details: {
        contains: props.body.search,
      },
    }),
  } satisfies Prisma.reddit_clone_admin_audit_logsWhereInput;
  const data = await MyGlobal.prisma.reddit_clone_admin_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCloneAdminAuditLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_admin_audit_logs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneAdminAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
