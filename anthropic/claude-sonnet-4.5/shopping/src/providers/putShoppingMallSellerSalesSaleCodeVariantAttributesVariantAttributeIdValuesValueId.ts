import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerSalesSaleCodeVariantAttributesVariantAttributeIdValuesValueId(props: {
  seller: SellerPayload;
  saleCode: string;
  variantAttributeId: string & tags.Format<"uuid">;
  valueId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleVariantValue.IUpdate;
}): Promise<IShoppingMallSaleVariantValue> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      seller: {
        id: props.seller.id,
      },
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

  const existingValue =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.findFirst({
      where: {
        id: props.valueId,
        shopping_mall_sale_variant_attribute_id: props.variantAttributeId,
      },
    });

  if (!existingValue) {
    throw new HttpException("Variant value not found", 404);
  }

  const updatedValue =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.update({
      where: {
        id: props.valueId,
      },
      data: {
        ...(props.body.value !== undefined && { value: props.body.value }),
        ...(props.body.display_order !== undefined && {
          display_order: props.body.display_order,
        }),
        ...(props.body.color_code !== undefined && {
          color_code: props.body.color_code,
        }),
      },
    });

  const allValues =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.findMany({
      where: {
        shopping_mall_sale_variant_attribute_id: props.variantAttributeId,
      },
      orderBy: {
        display_order: "asc",
      },
    });

  return {
    id: updatedValue.id,
    shopping_mall_sale_variant_attribute_id:
      updatedValue.shopping_mall_sale_variant_attribute_id,
    value: updatedValue.value,
    color_code: updatedValue.color_code ?? undefined,
    display_order: updatedValue.display_order,
    attribute: {
      id: variantAttribute.id,
      sale_id: variantAttribute.shopping_mall_sale_id,
      name: variantAttribute.name,
      display_order: variantAttribute.display_order,
      created_at: toISOStringSafe(variantAttribute.created_at),
      values: allValues.map((v) => ({
        id: v.id,
        shopping_mall_sale_variant_attribute_id:
          v.shopping_mall_sale_variant_attribute_id,
        value: v.value,
        color_code: v.color_code ?? undefined,
        display_order: v.display_order,
        created_at: toISOStringSafe(v.created_at),
      })),
    },
    created_at: toISOStringSafe(updatedValue.created_at),
  };
}
