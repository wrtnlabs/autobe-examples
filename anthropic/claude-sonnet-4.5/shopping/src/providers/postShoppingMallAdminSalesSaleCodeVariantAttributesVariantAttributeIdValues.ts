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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminSalesSaleCodeVariantAttributesVariantAttributeIdValues(props: {
  admin: AdminPayload;
  saleCode: string;
  variantAttributeId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleVariantValue.ICreate;
}): Promise<IShoppingMallSaleVariantValue> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  const attribute =
    await MyGlobal.prisma.shopping_mall_sale_variant_attributes.findFirst({
      where: {
        id: props.variantAttributeId,
        shopping_mall_sale_id: sale.id,
      },
    });

  if (!attribute) {
    throw new HttpException("Variant attribute not found", 404);
  }

  const existingValue =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.findFirst({
      where: {
        shopping_mall_sale_variant_attribute_id: props.variantAttributeId,
        value: props.body.value,
      },
    });

  if (existingValue) {
    throw new HttpException(
      "Duplicate variant value name within the same attribute",
      400,
    );
  }

  const created =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.create({
      data: {
        id: v4(),
        shopping_mall_sale_variant_attribute_id: props.variantAttributeId,
        value: props.body.value,
        color_code: props.body.color_code ?? null,
        display_order: props.body.display_order,
        created_at: new Date(),
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
    id: created.id,
    shopping_mall_sale_variant_attribute_id:
      created.shopping_mall_sale_variant_attribute_id,
    value: created.value,
    color_code: created.color_code ?? undefined,
    display_order: created.display_order,
    attribute: {
      id: attribute.id,
      sale_id: attribute.shopping_mall_sale_id,
      name: attribute.name,
      display_order: attribute.display_order,
      created_at: toISOStringSafe(attribute.created_at),
      values: allValues.map((val) => ({
        id: val.id,
        shopping_mall_sale_variant_attribute_id:
          val.shopping_mall_sale_variant_attribute_id,
        value: val.value,
        color_code: val.color_code ?? undefined,
        display_order: val.display_order,
        created_at: toISOStringSafe(val.created_at),
      })),
    },
    created_at: toISOStringSafe(created.created_at),
  };
}
