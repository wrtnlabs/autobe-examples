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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeOwnerAuditLogsMyActivity(props: {
  owner: OwnerPayload;
  body: IRedditLikeOwnerAuditLog.IRequest;
}): Promise<IPageIRedditLikeOwnerAuditLog.ISummary> {
  const page = props.body.page ? parseInt(props.body.page) : 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const createdAtFilter =
    props.body.createdAtFrom || props.body.createdAtTo
      ? {
          ...(props.body.createdAtFrom && {
            gte: new Date(props.body.createdAtFrom),
          }),
          ...(props.body.createdAtTo && {
            lte: new Date(props.body.createdAtTo),
          }),
        }
      : undefined;
  const whereInput = {
    reddit_like_owner_id: props.owner.id,
    ...(props.body.action && { action: props.body.action }),
    ...(props.body.entityType !== undefined && {
      entity_type: props.body.entityType,
    }),
    ...(props.body.entityId && { entity_id: props.body.entityId }),
    ...(createdAtFilter && { created_at: createdAtFilter }),
    ...(props.body.search && {
      OR: [
        { action: { contains: props.body.search } },
        { entity_type: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.reddit_like_owner_audit_logsWhereInput;
  const data = await MyGlobal.prisma.reddit_like_owner_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      action: true,
      entity_type: true,
      entity_id: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_like_owner_audit_logs.count({
    where: whereInput,
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      action: item.action,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      owner: {
        id: props.owner.id,
        username: (props.owner as any).username ?? "",
        displayName:
          (props.owner as any).displayName ??
          (props.owner as any).display_name ??
          (props.owner as any).username ??
          "",
        email: (props.owner as any).email ?? "",
        isActive:
          (props.owner as any).isActive ??
          (props.owner as any).is_active ??
          true,
      } satisfies IRedditLikeOwner.ISummary,
      created_at: toISOStringSafe(item.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
