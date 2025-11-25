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

export async function getShoppingMallSalesSaleCodeVariantAttributesVariantAttributeIdValuesValueId(props: {
  saleCode: string;
  variantAttributeId: string & tags.Format<"uuid">;
  valueId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleVariantValue> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { code: props.saleCode },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  const variantValue =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.findUnique({
      where: { id: props.valueId },
    });

  if (!variantValue) {
    throw new HttpException("Variant value not found", 404);
  }

  if (
    variantValue.shopping_mall_sale_variant_attribute_id !==
    props.variantAttributeId
  ) {
    throw new HttpException(
      "Variant value does not belong to the specified attribute",
      404,
    );
  }

  const attribute =
    await MyGlobal.prisma.shopping_mall_sale_variant_attributes.findUnique({
      where: { id: props.variantAttributeId },
    });

  if (!attribute) {
    throw new HttpException("Variant attribute not found", 404);
  }

  if (attribute.shopping_mall_sale_id !== sale.id) {
    throw new HttpException(
      "Variant attribute does not belong to the specified sale",
      404,
    );
  }

  const allValues =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.findMany({
      where: {
        shopping_mall_sale_variant_attribute_id: props.variantAttributeId,
      },
      orderBy: { display_order: "asc" },
    });

  return {
    id: variantValue.id as string & tags.Format<"uuid">,
    shopping_mall_sale_variant_attribute_id:
      variantValue.shopping_mall_sale_variant_attribute_id as string &
        tags.Format<"uuid">,
    value: variantValue.value,
    color_code: variantValue.color_code ?? undefined,
    display_order: variantValue.display_order,
    attribute: {
      id: attribute.id as string & tags.Format<"uuid">,
      sale_id: attribute.shopping_mall_sale_id as string & tags.Format<"uuid">,
      name: attribute.name,
      display_order: attribute.display_order,
      created_at: toISOStringSafe(attribute.created_at),
      values: allValues.map((v) => ({
        id: v.id as string & tags.Format<"uuid">,
        shopping_mall_sale_variant_attribute_id:
          v.shopping_mall_sale_variant_attribute_id as string &
            tags.Format<"uuid">,
        value: v.value,
        color_code: v.color_code ?? undefined,
        display_order: v.display_order,
        created_at: toISOStringSafe(v.created_at),
      })),
    },
    created_at: toISOStringSafe(variantValue.created_at),
  };
}
