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

export async function postShoppingMallSellerSalesSaleCodeVariantAttributesVariantAttributeIdValues(props: {
  seller: SellerPayload;
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

  if (sale.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this sale", 403);
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
        shopping_mall_sale_variant_attribute_id: props.variantAttributeId,
        value: props.body.value,
      },
    });

  if (existingValue) {
    throw new HttpException(
      "Duplicate variant value: this value already exists for this attribute",
      400,
    );
  }

  const created =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_sale_variant_attribute_id: props.variantAttributeId,
        value: props.body.value,
        color_code: props.body.color_code ?? null,
        display_order: props.body.display_order,
        created_at: new Date(),
      },
    });

  const allAttributeValues =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.findMany({
      where: {
        shopping_mall_sale_variant_attribute_id: props.variantAttributeId,
      },
      orderBy: {
        display_order: "asc",
      },
    });

  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_sale_variant_attribute_id:
      created.shopping_mall_sale_variant_attribute_id as string &
        tags.Format<"uuid">,
    value: created.value,
    color_code: created.color_code ?? undefined,
    display_order: created.display_order,
    attribute: {
      id: variantAttribute.id as string & tags.Format<"uuid">,
      sale_id: variantAttribute.shopping_mall_sale_id as string &
        tags.Format<"uuid">,
      name: variantAttribute.name,
      display_order: variantAttribute.display_order,
      created_at: toISOStringSafe(variantAttribute.created_at),
      values: allAttributeValues.map((v) => ({
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
    created_at: toISOStringSafe(created.created_at),
  };
}
