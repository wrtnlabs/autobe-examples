import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog";
import { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAuditLogs(props: {
  body: IShoppingMallAdministratorAuditLog.IRequest;
}): Promise<IPageIShoppingMallAdministratorAuditLog.ISummary> {
  const page =
    typeof (props.body as any).page === "number" && (props.body as any).page > 0
      ? (props.body as any).page
      : 1;
  const limit =
    typeof (props.body as any).limit === "number" &&
    (props.body as any).limit > 0
      ? (props.body as any).limit
      : 100;
  const skip = (page - 1) * limit;
  const where: Partial<{
    event_type?: string | null;
    actor_type?: string | null;
    actor_id?: string | null;
    ip?: string | null;
    created_at?: {
      gte?: string;
      lte?: string;
    };
  }> = {};
  if (typeof (props.body as any).eventType === "string") {
    where.event_type = (props.body as any).eventType;
  } else if ((props.body as any).eventType === null) {
    where.event_type = null;
  }
  if (typeof (props.body as any).actorType === "string") {
    where.actor_type = (props.body as any).actorType;
  } else if ((props.body as any).actorType === null) {
    where.actor_type = null;
  }
  if (typeof (props.body as any).actorId === "string") {
    where.actor_id = (props.body as any).actorId;
  } else if ((props.body as any).actorId === null) {
    where.actor_id = null;
  }
  if (typeof (props.body as any).ip === "string") {
    where.ip = (props.body as any).ip;
  } else if ((props.body as any).ip === null) {
    where.ip = null;
  }
  if ((props.body as any).createdAfter || (props.body as any).createdBefore) {
    where.created_at = {};
    if (typeof (props.body as any).createdAfter === "string") {
      where.created_at.gte = (props.body as any).createdAfter;
    }
    if (typeof (props.body as any).createdBefore === "string") {
      where.created_at.lte = (props.body as any).createdBefore;
    }
  }
  const data = await MyGlobal.prisma.shopping_mall_audit_logs.findMany({
    where: where as Prisma.shopping_mall_audit_logsWhereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      event_type: true,
      actor_type: true,
      actor_id: true,
      ip: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_audit_logs.count({
    where: where as Prisma.shopping_mall_audit_logsWhereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      event_type: record.event_type,
      actor_type: record.actor_type,
      actor_id: record.actor_id,
      ip: record.ip,
      created_at: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
    })),
  };
}
