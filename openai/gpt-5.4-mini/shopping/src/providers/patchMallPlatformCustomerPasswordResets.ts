import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorPasswordReset";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerPasswordResets(props: {
  customer: CustomerPayload;
  body: IMallPlatformAdministratorPasswordReset.IRequest;
}): Promise<IPageIMallPlatformAdministratorPasswordReset> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const resetRecord =
    await MyGlobal.prisma.mall_platform_administrator_password_resets.findFirst(
      {
        where: {
          token: props.body.token,
          deleted_at: null,
          expired_at: {
            gt: new globalThis.Date(),
          },
        },
        select: {
          id: true,
          token: true,
          expired_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          administrator: {
            select: {
              id: true,
              email: true,
              grade: true,
              status: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    );
  if (resetRecord === null) {
    throw new HttpException("Invalid or expired password reset token", 400);
  }
  await MyGlobal.prisma.mall_platform_administrators.update({
    where: { id: resetRecord.administrator.id },
    data: {
      password_hash: await PasswordUtil.hash(props.body.password),
      updated_at: new globalThis.Date(),
    },
  });
  await MyGlobal.prisma.mall_platform_administrator_password_resets.update({
    where: { id: resetRecord.id },
    data: {
      deleted_at: new globalThis.Date(),
      updated_at: new globalThis.Date(),
    },
  });
  const [data, records] = await Promise.all([
    MyGlobal.prisma.mall_platform_administrator_password_resets.findMany({
      where: { deleted_at: null },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        administrator: {
          select: {
            id: true,
            email: true,
            grade: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        token: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.mall_platform_administrator_password_resets.count({
      where: { deleted_at: null },
    }),
  ]);
  return {
    data: data.map((item) => ({
      id: item.id,
      administrator: {
        id: item.administrator.id,
        email: item.administrator.email,
        grade: item.administrator.grade,
        status: item.administrator.status,
        createdAt: toISOStringSafe(item.administrator.created_at),
        updatedAt: toISOStringSafe(item.administrator.updated_at),
        deletedAt: item.administrator.deleted_at
          ? toISOStringSafe(item.administrator.deleted_at)
          : null,
      },
      token: item.token,
      expiredAt: toISOStringSafe(item.expired_at),
      createdAt: toISOStringSafe(item.created_at),
      updatedAt: toISOStringSafe(item.updated_at),
      deletedAt: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
