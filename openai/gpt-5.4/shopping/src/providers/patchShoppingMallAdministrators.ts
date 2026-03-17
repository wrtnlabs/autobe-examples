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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministrators(props: {
  body: IShoppingMallAdministrator.IRequest;
}): Promise<IPageIShoppingMallAdministrator.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderByInput =
    props.body.sort === undefined || props.body.sort === "newest"
      ? ([
          { created_at: "desc" },
          { id: "desc" },
        ] satisfies Prisma.shopping_mall_administratorsOrderByWithRelationInput[])
      : props.body.sort === "oldest"
        ? ([
            { created_at: "asc" },
            { id: "asc" },
          ] satisfies Prisma.shopping_mall_administratorsOrderByWithRelationInput[])
        : props.body.sort === "email_asc"
          ? ([
              { email: "asc" },
              { id: "asc" },
            ] satisfies Prisma.shopping_mall_administratorsOrderByWithRelationInput[])
          : props.body.sort === "email_desc"
            ? ([
                { email: "desc" },
                { id: "desc" },
              ] satisfies Prisma.shopping_mall_administratorsOrderByWithRelationInput[])
            : props.body.sort === "updated_desc"
              ? ([
                  { updated_at: "desc" },
                  { id: "desc" },
                ] satisfies Prisma.shopping_mall_administratorsOrderByWithRelationInput[])
              : props.body.sort === "updated_asc"
                ? ([
                    { updated_at: "asc" },
                    { id: "asc" },
                  ] satisfies Prisma.shopping_mall_administratorsOrderByWithRelationInput[])
                : null;
  if (orderByInput === null) {
    throw new HttpException("Invalid sort", 400);
  }
  const whereInput = {
    ...(props.body.search !== undefined && props.body.search.length !== 0
      ? {
          email: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : {}),
    ...(props.body.active !== undefined ? { active: props.body.active } : {}),
    ...(props.body.banned !== undefined ? { banned: props.body.banned } : {}),
  } satisfies Prisma.shopping_mall_administratorsWhereInput;
  const superAdministrators =
    await MyGlobal.prisma.shopping_mall_super_administrators.findMany({
      select: {
        id: true,
      },
    });
  const superAdministratorIdSet: Set<string> = new Set(
    superAdministrators.map((record) => record.id),
  );
  const data = await MyGlobal.prisma.shopping_mall_administrators.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      email: true,
      active: true,
      banned: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_administrators.count({
    where: whereInput,
  });
  return {
    data: data.map((administrator) => ({
      id: administrator.id,
      email: administrator.email,
      grade: superAdministratorIdSet.has(administrator.id)
        ? "superAdministrator"
        : "administrator",
      active: administrator.active,
      banned: administrator.banned,
      created_at: administrator.created_at.toISOString(),
      updated_at: administrator.updated_at.toISOString(),
      deleted_at: administrator.deleted_at?.toISOString() ?? null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
