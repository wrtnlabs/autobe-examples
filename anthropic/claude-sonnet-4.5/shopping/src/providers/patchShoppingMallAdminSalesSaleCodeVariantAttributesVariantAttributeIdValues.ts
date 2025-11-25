import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import { IPageIShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleVariantValue";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSalesSaleCodeVariantAttributesVariantAttributeIdValues(props: {
  admin: AdminPayload;
  saleCode: string;
  variantAttributeId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleVariantValue.IRequest;
}): Promise<IPageIShoppingMallSaleVariantValue.ISummary> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  const variantAttribute =
    await MyGlobal.prisma.shopping_mall_sale_variant_attributes.findFirst({
      where: {
        id: props.variantAttributeId,
        shopping_mall_sale_id: sale.id,
      },
    });

  if (!variantAttribute) {
    throw new HttpException("Variant attribute not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const sortField = props.body.sort ?? "display_order";
  const sortOrder = props.body.order ?? "asc";

  const orderByClause =
    sortField === "name"
      ? { value: sortOrder }
      : sortField === "created_at"
        ? { created_at: sortOrder }
        : { display_order: sortOrder };

  const whereClause = {
    shopping_mall_sale_variant_attribute_id: props.variantAttributeId,
    ...(props.body.search && {
      value: {
        contains: props.body.search,
        mode: "insensitive" as Prisma.QueryMode,
      },
    }),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sale_variant_values.findMany({
      where: whereClause,
      orderBy: orderByClause,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_sale_variant_values.count({
      where: whereClause,
    }),
  ]);

  return {
    data: data.map((item) => ({
      id: item.id,
      shopping_mall_sale_variant_attribute_id:
        item.shopping_mall_sale_variant_attribute_id,
      value: item.value,
      color_code: item.color_code ?? undefined,
      display_order: item.display_order,
      created_at: toISOStringSafe(item.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
