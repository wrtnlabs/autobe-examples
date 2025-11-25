import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerSalesSaleCodeVariantAttributesVariantAttributeId(props: {
  seller: SellerPayload;
  saleCode: string;
  variantAttributeId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleVariantAttribute.IUpdate;
}): Promise<IShoppingMallSaleVariantAttribute> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    include: {
      seller: true,
      category: true,
    },
  });

  if (!sale) {
    throw new HttpException(
      "Sale not found or you do not have permission to access it",
      404,
    );
  }

  const existingAttribute =
    await MyGlobal.prisma.shopping_mall_sale_variant_attributes.findFirst({
      where: {
        id: props.variantAttributeId,
        shopping_mall_sale_id: sale.id,
      },
    });

  if (!existingAttribute) {
    throw new HttpException("Variant attribute not found for this sale", 404);
  }

  const updated =
    await MyGlobal.prisma.shopping_mall_sale_variant_attributes.update({
      where: {
        id: props.variantAttributeId,
      },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.display_order !== undefined && {
          display_order: props.body.display_order,
        }),
      },
    });

  const variantValues =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.findMany({
      where: {
        shopping_mall_sale_variant_attribute_id: updated.id,
      },
      orderBy: {
        display_order: "asc",
      },
    });

  return {
    id: updated.id,
    shopping_mall_sale_id: updated.shopping_mall_sale_id,
    name: updated.name,
    display_order: updated.display_order,
    sale: {
      id: sale.id,
      code: sale.code,
      title: sale.title,
      status: typia.assert<
        "draft" | "pending_approval" | "published" | "suspended" | "archived"
      >(sale.status),
      condition: typia.assert<"new" | "refurbished" | "used">(sale.condition),
      brand: sale.brand ?? undefined,
      short_description: sale.short_description ?? undefined,
      price: 0,
      thumbnail_url: undefined,
      return_policy_days: sale.return_policy_days,
      warranty_info: sale.warranty_info ?? undefined,
      created_at: toISOStringSafe(sale.created_at),
      updated_at: toISOStringSafe(sale.updated_at),
      deleted_at: sale.deleted_at
        ? toISOStringSafe(sale.deleted_at)
        : undefined,
      seller: {
        id: sale.seller.id,
        store_name: sale.seller.store_name,
        email: sale.seller.email,
        status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
          sale.seller.status,
        ),
        email_verified: sale.seller.email_verified,
      },
      category: {
        id: sale.category.id,
        name: sale.category.name,
        slug: sale.category.slug,
        description: sale.category.description ?? undefined,
        image_url: sale.category.image_url ?? undefined,
        parent_id: sale.category.parent_id ?? undefined,
        status: sale.category.status,
        display_order: sale.category.display_order,
        product_count: sale.category.product_count,
        created_at: toISOStringSafe(sale.category.created_at),
        updated_at: toISOStringSafe(sale.category.updated_at),
      },
    },
    values: variantValues.map((value) => ({
      id: value.id,
      shopping_mall_sale_variant_attribute_id:
        value.shopping_mall_sale_variant_attribute_id,
      value: value.value,
      color_code: value.color_code ?? undefined,
      display_order: value.display_order,
      created_at: toISOStringSafe(value.created_at),
    })),
    created_at: toISOStringSafe(updated.created_at),
  };
}
