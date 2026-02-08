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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorAuditLogs(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorAuditLog.IRequest;
}): Promise<IPageIShoppingMallAdministratorAuditLog.ISummary> {
  const page = (props.body as any).page ?? 1;
  const limit = (props.body as any).limit ?? 100;
  const skip = (page - 1) * limit;
  const insensitiveMode = "insensitive" as const;
  const createdAtGte = (props.body as any).created_at_gte as string | undefined;
  const createdAtLte = (props.body as any).created_at_lte as string | undefined;
  const where: Prisma.shopping_mall_audit_logsWhereInput = {
    AND: [
      {
        event_type: (props.body as any).event_type
          ? { contains: (props.body as any).event_type, mode: insensitiveMode }
          : undefined,
      },
      {
        actor_type: (props.body as any).actor_type
          ? { contains: (props.body as any).actor_type, mode: insensitiveMode }
          : undefined,
      },
      {
        created_at:
          createdAtGte || createdAtLte
            ? {
                gte: createdAtGte,
                lte: createdAtLte,
              }
            : undefined,
      },
      {
        ip: (props.body as any).ip_address
          ? { contains: (props.body as any).ip_address, mode: insensitiveMode }
          : undefined,
      },
      {
        user_agent: (props.body as any).user_agent
          ? { contains: (props.body as any).user_agent, mode: insensitiveMode }
          : undefined,
      },
      {
        description: (props.body as any).description
          ? { contains: (props.body as any).description, mode: insensitiveMode }
          : undefined,
      },
    ],
  };
  const data = await MyGlobal.prisma.shopping_mall_audit_logs.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      event_type: true,
      description: true,
      actor_type: true,
      actor_id: true,
      ip: true,
      user_agent: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_audit_logs.count({ where });
  return {
    data: data.map((record) => ({
      id: record.id,
      event_type: record.event_type,
      description: record.description ?? null,
      actor_type: record.actor_type ?? null,
      actor_id: record.actor_id ?? null,
      ip_address: record.ip ?? null,
      user_agent: record.user_agent ?? null,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
