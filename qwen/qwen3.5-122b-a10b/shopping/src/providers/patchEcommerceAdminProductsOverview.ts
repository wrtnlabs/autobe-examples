import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceProductAtSummaryTransformer } from "../transformers/EcommerceProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminProductsOverview(props: {
  admin: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
  };
  body: IEcommerceProduct.IRequest;
}): Promise<IPageIEcommerceProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_productsWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && {
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.category_id !== undefined && {
      category_id: props.body.category_id,
    }),
    ...(props.body.min_price !== undefined && {
      base_price: {
        gte: props.body.min_price,
      },
    }),
    ...(props.body.max_price !== undefined && {
      base_price: {
        lte: props.body.max_price,
      },
    }),
    ...(props.body.seller_id !== undefined && {
      seller_id: props.body.seller_id,
    }),
  } satisfies Prisma.ecommerce_productsWhereInput;
  const orderByInput: Prisma.ecommerce_productsOrderByWithRelationInput =
    props.body.sort_by === "base_price"
      ? { base_price: props.body.sort_order ?? "asc" }
      : props.body.sort_by === "name"
        ? { name: props.body.sort_order ?? "asc" }
        : props.body.sort_by === "updated_at"
          ? { updated_at: props.body.sort_order ?? "desc" }
          : { created_at: props.body.sort_order ?? "desc" };
  const records = await MyGlobal.prisma.ecommerce_products.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EcommerceProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_products.count({
    where: whereInput,
  });
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceProductAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceProduct.ISummary;
}
