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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorPasswordResets(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformAdministratorPasswordReset.IRequest;
}): Promise<IPageIMallPlatformAdministratorPasswordReset> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const now: string = new Date().toISOString();
  const tokenRecord =
    await MyGlobal.prisma.mall_platform_administrator_password_resets.findFirstOrThrow(
      {
        where: {
          token: props.body.token,
          deleted_at: null,
          expired_at: {
            gt: now,
          },
        },
        select: {
          id: true,
          administrator_id: true,
          token: true,
          expired_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (tokenRecord.administrator_id !== props.administrator.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(
    async (tx) => {
      const hashedPassword: string = await PasswordUtil.hash(
        props.body.password,
      );
      await tx.mall_platform_administrators.update({
        where: {
          id: tokenRecord.administrator_id,
        },
        data: {
          password_hash: hashedPassword,
          updated_at: new Date(),
        },
      });
      await tx.mall_platform_administrator_password_resets.update({
        where: {
          id: tokenRecord.id,
        },
        data: {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  const whereInput = {
    administrator_id: props.administrator.id,
  } satisfies Prisma.mall_platform_administrator_password_resetsWhereInput;
  const [data, records] = await Promise.all([
    MyGlobal.prisma.mall_platform_administrator_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
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
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      async (record) =>
        ({
          id: record.id,
          administrator: {
            id: record.administrator.id,
            email: record.administrator.email,
            grade: record.administrator.grade,
            status: record.administrator.status,
            createdAt: record.administrator.created_at.toISOString(),
            updatedAt: record.administrator.updated_at.toISOString(),
            deletedAt: record.administrator.deleted_at?.toISOString() ?? null,
          } satisfies IMallPlatformAdministrator.ISummary,
          token: record.token,
          expiredAt: record.expired_at.toISOString(),
          createdAt: record.created_at.toISOString(),
          updatedAt: record.updated_at.toISOString(),
          deletedAt: record.deleted_at?.toISOString() ?? null,
        }) satisfies IMallPlatformAdministratorPasswordReset,
    ),
  };
}
