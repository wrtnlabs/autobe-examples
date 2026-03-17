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
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellers(props: {
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    ...(props.body.includeDeleted === true ? {} : { deleted_at: null }),
    ...(props.body.approval_status !== undefined
      ? { approval_status: props.body.approval_status }
      : {}),
    ...(props.body.suspended !== undefined
      ? { suspended: props.body.suspended }
      : {}),
    ...(props.body.banned !== undefined ? { banned: props.body.banned } : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: new globalThis.Date(props.body.createdAtFrom) }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: new globalThis.Date(props.body.createdAtTo) }
              : {}),
          },
        }
      : {}),
    ...(props.body.updatedAtFrom !== undefined ||
    props.body.updatedAtTo !== undefined
      ? {
          updated_at: {
            ...(props.body.updatedAtFrom !== undefined
              ? { gte: new globalThis.Date(props.body.updatedAtFrom) }
              : {}),
            ...(props.body.updatedAtTo !== undefined
              ? { lte: new globalThis.Date(props.body.updatedAtTo) }
              : {}),
          },
        }
      : {}),
    ...(props.body.search !== undefined && props.body.search.length !== 0
      ? {
          OR: [
            {
              email: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.shopping_mall_sellersWhereInput;
  const orderBy =
    props.body.sort === "created_at"
      ? ([
          { created_at: "asc" },
          { id: "asc" },
        ] satisfies Prisma.shopping_mall_sellersOrderByWithRelationInput[])
      : props.body.sort === "-created_at"
        ? ([
            { created_at: "desc" },
            { id: "asc" },
          ] satisfies Prisma.shopping_mall_sellersOrderByWithRelationInput[])
        : props.body.sort === "updated_at"
          ? ([
              { updated_at: "asc" },
              { id: "asc" },
            ] satisfies Prisma.shopping_mall_sellersOrderByWithRelationInput[])
          : props.body.sort === "-updated_at"
            ? ([
                { updated_at: "desc" },
                { id: "asc" },
              ] satisfies Prisma.shopping_mall_sellersOrderByWithRelationInput[])
            : props.body.sort === "email"
              ? ([
                  { email: "asc" },
                  { id: "asc" },
                ] satisfies Prisma.shopping_mall_sellersOrderByWithRelationInput[])
              : props.body.sort === "-email"
                ? ([
                    { email: "desc" },
                    { id: "asc" },
                  ] satisfies Prisma.shopping_mall_sellersOrderByWithRelationInput[])
                : props.body.sort === "approval_status"
                  ? ([
                      { approval_status: "asc" },
                      { id: "asc" },
                    ] satisfies Prisma.shopping_mall_sellersOrderByWithRelationInput[])
                  : props.body.sort === "-approval_status"
                    ? ([
                        { approval_status: "desc" },
                        { id: "asc" },
                      ] satisfies Prisma.shopping_mall_sellersOrderByWithRelationInput[])
                    : ([
                        { created_at: "desc" },
                        { id: "asc" },
                      ] satisfies Prisma.shopping_mall_sellersOrderByWithRelationInput[]);
  const data = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ShoppingMallSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSellerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
