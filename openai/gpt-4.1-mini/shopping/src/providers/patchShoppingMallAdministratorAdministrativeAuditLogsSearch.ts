import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrativeAuditLog";
import { IShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrativeAuditLog";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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

export async function patchShoppingMallAdministratorAdministrativeAuditLogsSearch(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministrativeAuditLog.IRequest;
}): Promise<IPageIShoppingMallAdministrativeAuditLog.ISummary> {
  const {
    actionType,
    targetEntity,
    administratorId,
    createdAtFrom,
    createdAtTo,
    actionDescriptionSearch,
    limit: limitRaw,
    offset: offsetRaw,
    page: pageRaw,
  } = props.body;
  const limit =
    limitRaw === undefined || limitRaw === null
      ? 20
      : Math.min(Math.max(limitRaw, 1), 100);
  const offset = offsetRaw === undefined || offsetRaw === null ? 0 : offsetRaw;
  const page =
    pageRaw === undefined || pageRaw === null
      ? Math.floor(offset / limit) + 1
      : pageRaw;
  const where: Prisma.shopping_mall_administrative_audit_logsWhereInput = {
    deleted_at: null,
    ...(actionType ? { action_type: actionType } : {}),
    ...(targetEntity ? { target_entity: targetEntity } : {}),
    ...(administratorId ? { administrator_id: administratorId } : {}),
    ...(createdAtFrom || createdAtTo
      ? {
          created_at: {
            ...(createdAtFrom ? { gte: createdAtFrom } : {}),
            ...(createdAtTo ? { lte: createdAtTo } : {}),
          },
        }
      : {}),
    ...(actionDescriptionSearch
      ? {
          action_description: {
            contains: actionDescriptionSearch,
            mode: "insensitive",
          },
        }
      : {}),
  };
  const [total, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_administrative_audit_logs.count({ where }),
    MyGlobal.prisma.shopping_mall_administrative_audit_logs.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        action_type: true,
        target_entity: true,
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
  ]);
  const toDateTime = (
    date: Date | null,
  ): (string & tags.Format<"date-time">) | null =>
    date === null
      ? null
      : (date.toISOString() as string & tags.Format<"date-time">);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
    data: records.map((record) => ({
      id: record.id,
      actionType: record.action_type,
      targetEntity: record.target_entity,
      createdAt: record.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updatedAt: record.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deletedAt:
        record.deleted_at === null
          ? null
          : (record.deleted_at.toISOString() as string &
              tags.Format<"date-time">),
      administrator: {
        id: record.administrator.id,
        email: record.administrator.email,
        name: record.administrator.name,
        isSuperAdmin: record.administrator.is_super_admin,
        createdAt: record.administrator.created_at.toISOString() as string &
          tags.Format<"date-time">,
        updatedAt: record.administrator.updated_at.toISOString() as string &
          tags.Format<"date-time">,
        deletedAt:
          record.administrator.deleted_at === null
            ? null
            : (record.administrator.deleted_at.toISOString() as string &
                tags.Format<"date-time">),
        administratorGrade: {
          id: record.administrator.administratorGrade.id,
          name: record.administrator.administratorGrade.name,
          grade: record.administrator.administratorGrade.grade,
          superAdministrator:
            record.administrator.administratorGrade.super_administrator,
        },
      },
    })),
  };
}
