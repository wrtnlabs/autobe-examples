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

export async function patchShoppingMallAdministratorAdministrativeAuditLogs(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministrativeAuditLog.IRequest;
}): Promise<IPageIShoppingMallAdministrativeAuditLog.ISummary> {
  const limit = props.body.limit ?? 20;
  const offset = props.body.offset ?? 0;
  const whereConditions: Prisma.shopping_mall_administrative_audit_logsWhereInput =
    {
      deleted_at: null,
      ...(props.body.actionType !== undefined && {
        action_type: props.body.actionType,
      }),
      ...(props.body.targetEntity !== undefined && {
        target_entity: props.body.targetEntity,
      }),
      ...(props.body.administratorId !== undefined && {
        administrator_id: props.body.administratorId,
      }),
      ...(props.body.createdAtFrom !== undefined ||
      props.body.createdAtTo !== undefined
        ? {
            created_at: {
              ...(props.body.createdAtFrom !== undefined
                ? { gte: props.body.createdAtFrom }
                : {}),
              ...(props.body.createdAtTo !== undefined
                ? { lte: props.body.createdAtTo }
                : {}),
            },
          }
        : {}),
      ...(props.body.actionDescriptionSearch !== undefined
        ? {
            action_description: {
              contains: props.body.actionDescriptionSearch,
              mode: "insensitive",
            },
          }
        : {}),
    };
  const data =
    await MyGlobal.prisma.shopping_mall_administrative_audit_logs.findMany({
      where: whereConditions,
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
    });
  const total =
    await MyGlobal.prisma.shopping_mall_administrative_audit_logs.count({
      where: whereConditions,
    });
  return {
    data: data.map((record) => ({
      id: record.id,
      actionType: record.action_type,
      targetEntity: record.target_entity,
      createdAt: record.created_at.toISOString() as unknown as string &
        tags.Format<"date-time">,
      updatedAt: record.updated_at.toISOString() as unknown as string &
        tags.Format<"date-time">,
      deletedAt:
        record.deleted_at === null
          ? null
          : (record.deleted_at.toISOString() as unknown as string &
              tags.Format<"date-time">),
      administrator: {
        id: record.administrator.id,
        email: record.administrator.email,
        name: record.administrator.name,
        isSuperAdmin: record.administrator.is_super_admin,
        createdAt:
          record.administrator.created_at.toISOString() as unknown as string &
            tags.Format<"date-time">,
        updatedAt:
          record.administrator.updated_at.toISOString() as unknown as string &
            tags.Format<"date-time">,
        deletedAt:
          record.administrator.deleted_at === null
            ? null
            : (record.administrator.deleted_at.toISOString() as unknown as string &
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
    pagination: {
      current: Math.floor(offset / limit) + 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
