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
import { ShoppingMallCustomerAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomers(props: {
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_customersWhereInput = {};
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.displayName !== undefined) {
    whereInput.display_name = {
      contains: props.body.displayName,
      mode: "insensitive",
    };
  }
  if (props.body.email !== undefined) {
    whereInput.email = {
      contains: props.body.email,
      mode: "insensitive",
    };
  }
  if (props.body.createdAtFrom !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.createdAtFrom),
    };
  }
  if (props.body.createdAtTo !== undefined) {
    if (whereInput.created_at !== undefined) {
      (whereInput.created_at as Prisma.DateTimeFilter).lte = new Date(
        props.body.createdAtTo,
      );
    } else {
      whereInput.created_at = {
        lte: new Date(props.body.createdAtTo),
      };
    }
  }
  if (props.body.deletedAt !== undefined) {
    if (props.body.deletedAt === null) {
      whereInput.deleted_at = null;
    } else {
      whereInput.deleted_at = {
        not: null,
      };
    }
  }
  const orderByInput: Prisma.shopping_mall_customersOrderByWithRelationInput =
    props.body.sortBy === "display_name"
      ? { display_name: props.body.sortOrder ?? "desc" }
      : props.body.sortBy === "email"
        ? { email: props.body.sortOrder ?? "desc" }
        : { created_at: props.body.sortOrder ?? "desc" };
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
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCustomerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
