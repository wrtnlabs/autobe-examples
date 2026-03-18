import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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

export async function patchShoppingMallAdministratorAdministrators(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministrator.IRequest;
}): Promise<IPageIShoppingMallAdministrator.ISummary> {
  const currentAdministrator =
    await MyGlobal.prisma.shopping_mall_administrators.findUnique({
      where: {
        id: props.administrator.id,
      },
      select: {
        id: true,
        grade: true,
        deleted_at: true,
      },
    });
  if (
    currentAdministrator === null ||
    currentAdministrator.deleted_at !== null ||
    currentAdministrator.grade !== "super administrator"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const administrators =
    await MyGlobal.prisma.shopping_mall_administrators.findMany({
      where: {
        deleted_at: null,
        ...(props.body.search !== undefined && props.body.search.length > 0
          ? {
              email: {
                contains: props.body.search,
                mode: "insensitive",
              },
            }
          : {}),
        ...(props.body.grade !== undefined ? { grade: props.body.grade } : {}),
        ...(props.body.accountStatus !== undefined
          ? { account_status: props.body.accountStatus }
          : {}),
      },
      skip,
      take: limit,
      orderBy: [
        {
          created_at: "desc",
        },
        {
          id: "asc",
        },
      ],
      select: {
        id: true,
        email: true,
        grade: true,
        account_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const records = await MyGlobal.prisma.shopping_mall_administrators.count({
    where: {
      deleted_at: null,
      ...(props.body.search !== undefined && props.body.search.length > 0
        ? {
            email: {
              contains: props.body.search,
              mode: "insensitive",
            },
          }
        : {}),
      ...(props.body.grade !== undefined ? { grade: props.body.grade } : {}),
      ...(props.body.accountStatus !== undefined
        ? { account_status: props.body.accountStatus }
        : {}),
    },
  });
  return {
    data: administrators.map((administrator) => ({
      id: administrator.id,
      email: administrator.email,
      grade: administrator.grade,
      accountStatus: administrator.account_status,
      createdAt: administrator.created_at.toISOString(),
      updatedAt: administrator.updated_at.toISOString(),
      deletedAt:
        administrator.deleted_at === null
          ? null
          : administrator.deleted_at.toISOString(),
    })),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
