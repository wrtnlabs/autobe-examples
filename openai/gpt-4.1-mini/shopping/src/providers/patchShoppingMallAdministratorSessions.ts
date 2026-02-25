import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorSession";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
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

export async function patchShoppingMallAdministratorSessions(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorSession.IRequest;
}): Promise<IPageIShoppingMallAdministratorSession.ISummary> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 100;
  const skip = (page - 1) * limit;
  const allowedSorts = new Set(["created_at", "expired_at", "updated_at"]);
  const sortKey = allowedSorts.has(props.body.sort ?? "created_at")
    ? props.body.sort!
    : "created_at";
  const where: Prisma.shopping_mall_administrator_sessionsWhereInput = {
    ...(props.body.administratorId
      ? { administrator_id: props.body.administratorId }
      : {}),
    ...(props.body.ip
      ? { ip: { contains: props.body.ip, mode: "insensitive" } }
      : {}),
    ...(props.body.href
      ? { href: { contains: props.body.href, mode: "insensitive" } }
      : {}),
    ...(props.body.referrer
      ? { referrer: { contains: props.body.referrer, mode: "insensitive" } }
      : {}),
    ...(props.body.expiredAt
      ? {
          expired_at: {
            ...(props.body.expiredAt.from
              ? { gte: new Date(props.body.expiredAt.from) }
              : {}),
            ...(props.body.expiredAt.to
              ? { lte: new Date(props.body.expiredAt.to) }
              : {}),
          },
        }
      : {}),
  };
  const orderBy: Prisma.shopping_mall_administrator_sessionsOrderByWithRelationInput =
    { [sortKey]: "desc" };
  const totalRecords =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.count({ where });
  const sessions =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
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
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  const data = sessions.map((session) => {
    return {
      id: session.id,
      administrator: {
        id: session.administrator.id,
        email: session.administrator.email,
        name: session.administrator.name,
        isSuperAdmin: session.administrator.is_super_admin,
        createdAt:
          session.administrator.created_at !== null
            ? toISOStringSafe(session.administrator.created_at)
            : "",
        updatedAt:
          session.administrator.updated_at !== null
            ? toISOStringSafe(session.administrator.updated_at)
            : "",
        deletedAt:
          session.administrator.deleted_at !== null
            ? toISOStringSafe(session.administrator.deleted_at)
            : "",
        administratorGrade: {
          id: session.administrator.administratorGrade.id,
          name: session.administrator.administratorGrade.name,
          grade: session.administrator.administratorGrade.grade,
          superAdministrator:
            session.administrator.administratorGrade.super_administrator,
        },
      },
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at:
        session.created_at !== null ? toISOStringSafe(session.created_at) : "",
      expired_at:
        session.expired_at !== null ? toISOStringSafe(session.expired_at) : "",
    };
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
    data,
  };
}
