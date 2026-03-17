import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdmin";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdminSuperAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallSuperAdmin.IRequest;
}): Promise<IPageIShoppingMallSuperAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const orderByInput = (
    props.body.sort === "email"
      ? {
          email:
            props.body.order === "asc" ? ("asc" as const) : ("desc" as const),
        }
      : {
          created_at:
            props.body.order === "asc" ? ("asc" as const) : ("desc" as const),
        }
  ) satisfies Prisma.shopping_mall_super_adminsOrderByWithRelationInput;
  const createdAtFilter:
    | Prisma.DateTimeFilter<"shopping_mall_super_admins">
    | undefined =
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          ...(props.body.createdAtFrom !== undefined && {
            gte: new Date(props.body.createdAtFrom),
          }),
          ...(props.body.createdAtTo !== undefined && {
            lte: new Date(props.body.createdAtTo),
          }),
        }
      : undefined;
  const whereInput = {
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email, mode: "insensitive" as const },
    }),
    ...(props.body.isActive === true && { deleted_at: null }),
    ...(props.body.isActive === false && { deleted_at: { not: null } }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  } satisfies Prisma.shopping_mall_super_adminsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_super_admins.findMany({
    where: whereInput,
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
    orderBy: orderByInput,
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.shopping_mall_super_admins.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (record) =>
        ({
          id: record.id,
          email: record.email,
          createdAt: record.created_at.toISOString(),
          updatedAt: record.updated_at.toISOString(),
          deletedAt:
            record.deleted_at !== null ? record.deleted_at.toISOString() : null,
        }) satisfies IShoppingMallSuperAdmin.ISummary,
    ),
  };
}
