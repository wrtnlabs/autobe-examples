import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerProducts(props: {
  customer: CustomerPayload;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = (props.body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (props.body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> as number;

  const where: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: props.body.include_deleted ? undefined : null,
    ...(props.body.brand !== undefined &&
      props.body.brand !== null && {
        brand: props.body.brand,
      }),
  };

  if (
    props.body.search_text !== undefined &&
    props.body.search_text !== null &&
    props.body.search_text.trim() !== ""
  ) {
    where.OR = [
      { name: { contains: props.body.search_text } },
      { code: { contains: props.body.search_text } },
      { brand: { contains: props.body.search_text } },
    ];
  }

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_products.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
    })),
  };
}
