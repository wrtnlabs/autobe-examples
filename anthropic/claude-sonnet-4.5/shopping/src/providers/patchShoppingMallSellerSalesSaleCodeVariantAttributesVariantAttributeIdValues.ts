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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSalesSaleCodeVariantAttributesVariantAttributeIdValues(props: {
  seller: SellerPayload;
  saleCode: string;
  variantAttributeId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleVariantValue.IRequest;
}): Promise<IPageIShoppingMallSaleVariantValue.ISummary> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found or access denied", 404);
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

  const whereCondition = {
    shopping_mall_sale_variant_attribute_id: props.variantAttributeId,
    ...(props.body.search && {
      value: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
  };

  const sortField = props.body.sort ?? "display_order";
  const sortOrder = props.body.order ?? "asc";

  const orderBy = (() => {
    if (sortField === "display_order") {
      return { display_order: sortOrder };
    } else if (sortField === "name") {
      return { value: sortOrder };
    } else {
      return { created_at: sortOrder };
    }
  })();

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sale_variant_values.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_sale_variant_values.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((value) => ({
      id: value.id,
      shopping_mall_sale_variant_attribute_id:
        value.shopping_mall_sale_variant_attribute_id,
      value: value.value,
      color_code: value.color_code ?? undefined,
      display_order: value.display_order,
      created_at: toISOStringSafe(value.created_at),
    })),
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
