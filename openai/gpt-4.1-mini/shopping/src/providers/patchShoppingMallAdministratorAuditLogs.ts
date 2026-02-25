import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
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
  const pageRaw = props.body.page ?? 1;
  const limitRaw = props.body.limit ?? 100;
  const page = pageRaw < 1 ? 1 : Math.floor(pageRaw);
  const limit = limitRaw < 1 ? 1 : limitRaw > 100 ? 100 : Math.floor(limitRaw);
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_administrator_audit_logsWhereInput = {
    deleted_at: null,
    ...(props.body.action ? { action: props.body.action } : {}),
    ...(props.body.administratorId
      ? { administrator_id: props.body.administratorId }
      : {}),
    ...(props.body.createdFrom || props.body.createdTo
      ? {
          created_at: {
            ...(props.body.createdFrom ? { gte: props.body.createdFrom } : {}),
            ...(props.body.createdTo ? { lte: props.body.createdTo } : {}),
          },
        }
      : {}),
    ...(props.body.keyword
      ? {
          OR: [
            {
              description: {
                contains: props.body.keyword,
                mode: "insensitive",
              },
            },
            { ip: { contains: props.body.keyword, mode: "insensitive" } },
            {
              user_agent: { contains: props.body.keyword, mode: "insensitive" },
            },
          ],
        }
      : {}),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_administrator_audit_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        action: true,
        description: true,
        ip: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrator: {
          select: {
            id: true,
            email: true,
            name: true,
            is_super_admin: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            administratorGrade: {
              select: {
                id: true,
                name: true,
                grade: true,
                super_administrator: true,
              },
            },
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_administrator_audit_logs.count({ where }),
  ]);
  return {
    data: data.map((record) => ({
      id: record.id,
      action: record.action,
      description: record.description,
      ip: record.ip,
      userAgent: record.user_agent,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
      administrator: {
        id: record.administrator.id,
        email: record.administrator.email,
        name: record.administrator.name,
        isSuperAdmin: record.administrator.is_super_admin,
        createdAt: toISOStringSafe(record.administrator.created_at),
        updatedAt: toISOStringSafe(record.administrator.updated_at),
        deletedAt: record.administrator.deleted_at
          ? toISOStringSafe(record.administrator.deleted_at)
          : null,
        administratorGrade: {
          id: record.administrator.administratorGrade.id,
          name: record.administrator.administratorGrade.name,
          grade: record.administrator.administratorGrade.grade,
          superAdministrator:
            record.administrator.administratorGrade.super_administrator,
        },
      },
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
