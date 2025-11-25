import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import { IPageIShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleVariantAttribute";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";

export async function patchShoppingMallSalesSaleCodeVariantAttributes(props: {
  saleCode: string;
  body: IShoppingMallSaleVariantAttribute.IRequest;
}): Promise<IPageIShoppingMallSaleVariantAttribute.ISummary> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "display_order";
  const order = props.body.order ?? "asc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sale_variant_attributes.findMany({
      where: {
        shopping_mall_sale_id: sale.id,
        ...(props.body.search && {
          name: {
            contains: props.body.search,
          },
        }),
      },
      skip: skip,
      take: limit,
      orderBy: {
        [sortBy]: order,
      },
      include: {
        shopping_mall_sale_variant_values: {
          orderBy: {
            display_order: "asc",
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_sale_variant_attributes.count({
      where: {
        shopping_mall_sale_id: sale.id,
        ...(props.body.search && {
          name: {
            contains: props.body.search,
          },
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((attr) => ({
      id: attr.id,
      sale_id: attr.shopping_mall_sale_id,
      name: attr.name,
      display_order: attr.display_order,
      created_at: toISOStringSafe(attr.created_at),
      values: attr.shopping_mall_sale_variant_values.map((val) => ({
        id: val.id,
        shopping_mall_sale_variant_attribute_id:
          val.shopping_mall_sale_variant_attribute_id,
        value: val.value,
        color_code: val.color_code === null ? undefined : val.color_code,
        display_order: val.display_order,
        created_at: toISOStringSafe(val.created_at),
      })),
    })),
  };
}
