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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_sellersWhereInput = {
    deleted_at: null,
  };
  if (props.body.search !== undefined) {
    whereInput.shop_name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.email !== undefined) {
    whereInput.email = {
      contains: props.body.email,
      mode: "insensitive",
    };
  }
  if (props.body.approval_status !== undefined) {
    whereInput.approval_status = props.body.approval_status;
  }
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = (props.body.sortOrder ?? "desc") as "asc" | "desc";
  const orderByInput: Prisma.shopping_mall_sellersOrderByWithRelationInput =
    sortField === "created_at"
      ? { created_at: sortOrder }
      : sortField === "shop_name"
        ? { shop_name: sortOrder }
        : { approval_status: sortOrder };
  const data = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallSellerAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
