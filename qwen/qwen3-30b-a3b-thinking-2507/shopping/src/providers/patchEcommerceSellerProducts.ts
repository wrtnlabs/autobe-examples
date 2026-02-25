import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductAtSummaryTransformer } from "../transformers/EcommerceProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerProducts(props: {
  seller: SellerPayload;
  body: IEcommerceProduct.IRequest;
}): Promise<IPageIEcommerceProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 12;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_productsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.category_id && { category_id: props.body.category_id }),
    ...(props.body.min_price !== undefined &&
      props.body.max_price !== undefined && {
        base_price: { gte: props.body.min_price, lte: props.body.max_price },
      }),
    ...(props.body.created_at_start &&
      props.body.created_at_end && {
        created_at: {
          gte: props.body.created_at_start,
          lte: props.body.created_at_end,
        },
      }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_products.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceProductAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_products.count({ where }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(data, (p) =>
    EcommerceProductAtSummaryTransformer.transform(p),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIEcommerceProduct.ISummary;
}
