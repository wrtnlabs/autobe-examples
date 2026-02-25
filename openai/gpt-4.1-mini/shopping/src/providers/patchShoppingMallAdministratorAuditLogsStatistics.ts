import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAuditLogStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuditLogStatistic";
import { IShoppingMallAuditLogStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLogStatistic";
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

export async function patchShoppingMallAdministratorAuditLogsStatistics(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAuditLogStatistic.IRequest;
}): Promise<IPageIShoppingMallAuditLogStatistic.ISummary> {
  const page: number =
    props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit: number =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.shopping_mall_audit_logsWhereInput = {};
  if (props.body.eventType !== undefined && props.body.eventType !== null) {
    where.event_type = props.body.eventType;
  }
  if (props.body.actorType !== undefined && props.body.actorType !== null) {
    where.actor_type = props.body.actorType;
  }
  if (props.body.startDate !== undefined && props.body.startDate !== null) {
    where.created_at = { gte: toISOStringSafe(props.body.startDate) };
  }
  if (props.body.endDate !== undefined && props.body.endDate !== null) {
    if (
      where.created_at !== undefined &&
      typeof where.created_at === "object" &&
      where.created_at !== null
    ) {
      where.created_at = {
        ...where.created_at,
        lte: toISOStringSafe(props.body.endDate),
      };
    } else {
      where.created_at = { lte: toISOStringSafe(props.body.endDate) };
    }
  }
  if (props.body.description !== undefined && props.body.description !== null) {
    where.description = {
      contains: props.body.description,
      mode: "insensitive",
    };
  }
  const total: number = await MyGlobal.prisma.shopping_mall_audit_logs.count({
    where,
  });
  if (total === 0) {
    return {
      pagination: { current: page, limit, records: 0, pages: 0 },
      data: [],
    };
  }
  const records = await MyGlobal.prisma.shopping_mall_audit_logs.groupBy({
    by: ["event_type", "actor_type"],
    where,
    _count: { event_type: true },
    _min: { created_at: true },
    _max: { created_at: true },
    orderBy: { _count: { event_type: "desc" } },
    skip,
    take: limit,
  });
  const data: IShoppingMallAuditLogStatistic.ISummaryItem[] = records.map(
    (r) => ({
      eventType: r.event_type,
      actorType: r.actor_type,
      count: r._count.event_type,
      earliest:
        r._min.created_at !== null && r._min.created_at !== undefined
          ? toISOStringSafe(r._min.created_at)
          : "1970-01-01T00:00:00.000Z",
      latest:
        r._max.created_at !== null && r._max.created_at !== undefined
          ? toISOStringSafe(r._max.created_at)
          : "1970-01-01T00:00:00.000Z",
    }),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
