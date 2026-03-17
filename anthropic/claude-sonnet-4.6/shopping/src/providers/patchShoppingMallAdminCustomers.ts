import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCustomers(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.nickname !== undefined && props.body.nickname !== null
      ? {
          nickname: {
            contains: props.body.nickname,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(props.body.email !== undefined && props.body.email !== null
      ? { email: { contains: props.body.email, mode: "insensitive" as const } }
      : {}),
    ...(props.body.isBanned !== undefined && props.body.isBanned !== null
      ? { is_banned: props.body.isBanned }
      : {}),
    ...(props.body.createdAt !== undefined && props.body.createdAt !== null
      ? {
          created_at: {
            ...(props.body.createdAt.from !== undefined &&
            props.body.createdAt.from !== null
              ? { gte: new Date(props.body.createdAt.from) }
              : {}),
            ...(props.body.createdAt.to !== undefined &&
            props.body.createdAt.to !== null
              ? { lte: new Date(props.body.createdAt.to) }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_customersWhereInput;
  const sortOrder =
    props.body.order === "asc" ? ("asc" as const) : ("desc" as const);
  const orderByInput = (
    props.body.sort === "nickname"
      ? { nickname: sortOrder }
      : { created_at: sortOrder }
  ) satisfies Prisma.shopping_mall_customersOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallCustomerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_customers.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCustomerAtSummaryTransformer.transform,
    ),
  };
}
