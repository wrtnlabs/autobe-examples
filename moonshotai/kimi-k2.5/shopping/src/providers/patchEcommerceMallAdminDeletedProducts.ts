import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminDeletedProducts(props: {
  admin: AdminPayload;
  body: IEcommerceMallProduct.IDeletedRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const deletedAtCondition: Prisma.DateTimeFilter = {};
  if (props.body.deleted_at_from) {
    deletedAtCondition.gte = props.body.deleted_at_from as unknown as Date;
  }
  if (props.body.deleted_at_to) {
    deletedAtCondition.lte = props.body.deleted_at_to as unknown as Date;
  }
  const whereInput: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: { not: null, ...deletedAtCondition },
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" },
    }),
    ...(props.body.seller_id && { seller_id: props.body.seller_id }),
    ...(props.body.category_id && { category_id: props.body.category_id }),
  } satisfies Prisma.ecommerce_mall_productsWhereInput;
  const sortParam = props.body.sort ?? "deleted_at:DESC";
  const [sortField, sortDirection] = sortParam.split(":") as [
    string,
    "ASC" | "DESC" | undefined,
  ];
  const direction = (sortDirection ?? "DESC").toLowerCase() as "asc" | "desc";
  const orderBy: Prisma.ecommerce_mall_productsOrderByWithRelationInput =
    sortField === "name"
      ? { name: direction }
      : sortField === "created_at"
        ? { created_at: direction }
        : { deleted_at: direction };
  const [products, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_products.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallProductAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_products.count({ where: whereInput }),
  ]);
  const transformedProducts = await ArrayUtil.asyncMap(
    products,
    EcommerceMallProductAtSummaryTransformer.transform,
  );
  return {
    data: transformedProducts,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
