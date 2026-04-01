import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdministrator";
import { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdministratorSuperAdministrators(props: {
  superAdministrator: SuperadministratorPayload;
  body: IShoppingMallSuperAdministrator.IRequest;
}): Promise<IPageIShoppingMallSuperAdministrator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_super_administratorsWhereInput = {
    ...(props.body.search !== undefined && {
      email: { contains: props.body.search },
    }),
    ...(props.body.deleted !== undefined
      ? { deleted_at: props.body.deleted ? { not: null } : null }
      : { deleted_at: null }),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: props.body.created_at_to,
            }),
          },
        }
      : {}),
  };
  const sortField = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "asc";
  const orderByInput = {
    [sortField]: direction,
  } satisfies Prisma.shopping_mall_super_administratorsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_super_administrators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_super_administrators.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((item) => ({
      id: item.id,
      email: item.email,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
      deleted_at: item.deleted_at?.toISOString() ?? null,
    })),
  };
}
