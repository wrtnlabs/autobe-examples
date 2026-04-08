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
import { ShoppingMallSuperAdminAtSummaryTransformer } from "../transformers/ShoppingMallSuperAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdminSuperAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallSuperAdmin.IRequest;
}): Promise<IPageIShoppingMallSuperAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && {
      email: { contains: props.body.search },
    }),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_super_adminsWhereInput;
  const orderByInput = {
    [props.body.sort ?? "created_at"]: props.body.direction ?? "desc",
  } satisfies Prisma.shopping_mall_super_adminsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_super_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallSuperAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_super_admins.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSuperAdminAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallSuperAdmin.ISummary;
}
