import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeOwnerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeOwnerAuditLog";
import { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { IRedditLikeOwnerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwnerAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeOwnerAuditLogAtSummaryTransformer } from "../transformers/RedditLikeOwnerAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeOwnerAuditLogs(props: {
  owner: OwnerPayload;
  body: IRedditLikeOwnerAuditLog.IRequest;
}): Promise<IPageIRedditLikeOwnerAuditLog.ISummary> {
  const limit = props.body.limit ?? 100;
  const page = props.body.page;
  const whereInput: Prisma.reddit_like_owner_audit_logsWhereInput = {
    ...(props.body.action !== undefined && { action: props.body.action }),
    ...(props.body.entityType !== undefined &&
      props.body.entityType !== null && { entity_type: props.body.entityType }),
    ...(props.body.entityId !== undefined &&
      props.body.entityId !== null && { entity_id: props.body.entityId }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: { gte: props.body.createdAtFrom },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: { lte: props.body.createdAtTo },
    }),
    ...(props.body.search !== undefined && {
      OR: [
        { action: { contains: props.body.search, mode: "insensitive" } },
        { entity_type: { contains: props.body.search, mode: "insensitive" } },
        { details: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(page !== undefined && {
      id: { lt: page },
    }),
  };
  const data = await MyGlobal.prisma.reddit_like_owner_audit_logs.findMany({
    where: whereInput,
    take: limit,
    orderBy: { id: "desc" },
    ...RedditLikeOwnerAuditLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_owner_audit_logs.count({
    where: {
      ...(props.body.action !== undefined && { action: props.body.action }),
      ...(props.body.entityType !== undefined &&
        props.body.entityType !== null && {
          entity_type: props.body.entityType,
        }),
      ...(props.body.entityId !== undefined &&
        props.body.entityId !== null && { entity_id: props.body.entityId }),
      ...(props.body.createdAtFrom !== undefined && {
        created_at: { gte: props.body.createdAtFrom },
      }),
      ...(props.body.createdAtTo !== undefined && {
        created_at: { lte: props.body.createdAtTo },
      }),
      ...(props.body.search !== undefined && {
        OR: [
          { action: { contains: props.body.search, mode: "insensitive" } },
          { entity_type: { contains: props.body.search, mode: "insensitive" } },
          { details: { contains: props.body.search, mode: "insensitive" } },
        ],
      }),
    },
  });
  const currentPage = page !== undefined ? 2 : 1;
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditLikeOwnerAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
