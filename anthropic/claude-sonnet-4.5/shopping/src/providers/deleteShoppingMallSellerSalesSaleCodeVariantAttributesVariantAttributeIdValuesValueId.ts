import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerSalesSaleCodeVariantAttributesVariantAttributeIdValuesValueId(props: {
  seller: SellerPayload;
  saleCode: string;
  variantAttributeId: string & tags.Format<"uuid">;
  valueId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleVariantValue> {
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

  const variantValue =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.findFirst({
      where: {
        id: props.valueId,
        shopping_mall_sale_variant_attribute_id: props.variantAttributeId,
      },
    });

  if (!variantValue) {
    throw new HttpException("Variant value not found", 404);
  }

  const valueCount =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.count({
      where: {
        shopping_mall_sale_variant_attribute_id: props.variantAttributeId,
      },
    });

  if (valueCount <= 1) {
    throw new HttpException(
      "Cannot delete the last remaining value for this variant attribute",
      400,
    );
  }

  const deleted =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.delete({
      where: {
        id: props.valueId,
      },
    });

  return {
    id: deleted.id,
    shopping_mall_sale_variant_attribute_id:
      deleted.shopping_mall_sale_variant_attribute_id,
    value: deleted.value,
    color_code: deleted.color_code ?? undefined,
    display_order: deleted.display_order,
    attribute: {
      id: variantAttribute.id,
      sale_id: variantAttribute.shopping_mall_sale_id,
      name: variantAttribute.name,
      display_order: variantAttribute.display_order,
      created_at: toISOStringSafe(variantAttribute.created_at),
      values: [],
    },
    created_at: toISOStringSafe(deleted.created_at),
  };
}
