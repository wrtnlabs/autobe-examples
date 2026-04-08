import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminSellers(props: {
  admin: AdminPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email },
    }),
    ...(props.body.approvalStatus !== undefined && {
      approval_status: props.body.approvalStatus,
    }),
    ...(props.body.createdAt !== undefined && {
      created_at: {
        ...(props.body.createdAt.gte !== undefined &&
          props.body.createdAt.gte !== null && {
            gte: props.body.createdAt.gte,
          }),
        ...(props.body.createdAt.lte !== undefined &&
          props.body.createdAt.lte !== null && {
            lte: props.body.createdAt.lte,
          }),
      },
    }),
  } satisfies Prisma.shopping_mall_sellersWhereInput;
  const sortField = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "desc";
  const orderByInput = {
    [sortField]: direction,
  } satisfies Prisma.shopping_mall_sellersOrderByWithRelationInput;
  const records = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallSellerAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallSeller.ISummary;
}
