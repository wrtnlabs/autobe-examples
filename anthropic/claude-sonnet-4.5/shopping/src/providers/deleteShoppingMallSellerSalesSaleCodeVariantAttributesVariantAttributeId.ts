import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function deleteShoppingMallSellerSalesSaleCodeVariantAttributesVariantAttributeId(props: {
  seller: SellerPayload;
  saleCode: string;
  variantAttributeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleVariantAttribute> {
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

  const variantValues =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.findMany({
      where: {
        shopping_mall_sale_variant_attribute_id: props.variantAttributeId,
      },
    });

  const variantValueIds = variantValues.map((v) => v.id);

  if (variantValueIds.length > 0) {
    const skusWithVariant =
      await MyGlobal.prisma.shopping_mall_sale_skus.findMany({
        where: {
          shopping_mall_sale_id: sale.id,
        },
      });

    const skuCount = skusWithVariant.filter((sku) => {
      try {
        const combination = JSON.parse(sku.variant_combination);
        return variantValueIds.some((valueId) =>
          Object.values(combination).includes(valueId),
        );
      } catch {
        return false;
      }
    }).length;

    if (skuCount > 0) {
      throw new HttpException(
        "Cannot delete variant attribute: it is referenced by existing SKUs. Please remove or reconfigure affected SKUs first.",
        400,
      );
    }
  }

  const [seller, category, minPriceSku, primaryImage] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: sale.shopping_mall_seller_id },
    }),
    MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: sale.shopping_mall_category_id },
    }),
    MyGlobal.prisma.shopping_mall_sale_skus.findFirst({
      where: {
        shopping_mall_sale_id: sale.id,
      },
      orderBy: {
        base_price: "asc",
      },
    }),
    MyGlobal.prisma.shopping_mall_sale_images.findFirst({
      where: {
        shopping_mall_sale_id: sale.id,
      },
      orderBy: {
        display_order: "asc",
      },
    }),
  ]);

  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_sale_variant_values.deleteMany({
      where: {
        shopping_mall_sale_variant_attribute_id: props.variantAttributeId,
      },
    });

    await tx.shopping_mall_sale_variant_attributes.delete({
      where: {
        id: props.variantAttributeId,
      },
    });
  });

  return {
    id: variantAttribute.id,
    shopping_mall_sale_id: variantAttribute.shopping_mall_sale_id,
    name: variantAttribute.name,
    display_order: variantAttribute.display_order,
    sale: {
      id: sale.id,
      code: sale.code,
      title: sale.title,
      status: sale.status satisfies string as
        | "draft"
        | "pending_approval"
        | "published"
        | "suspended"
        | "archived",
      condition: sale.condition satisfies string as
        | "new"
        | "refurbished"
        | "used",
      brand: sale.brand === null ? undefined : sale.brand,
      short_description:
        sale.short_description === null ? undefined : sale.short_description,
      price: minPriceSku?.base_price ?? 0,
      thumbnail_url:
        primaryImage?.url_small === null ? undefined : primaryImage?.url_small,
      return_policy_days: sale.return_policy_days,
      warranty_info:
        sale.warranty_info === null ? undefined : sale.warranty_info,
      created_at: toISOStringSafe(sale.created_at),
      updated_at: toISOStringSafe(sale.updated_at),
      deleted_at:
        sale.deleted_at === null ? undefined : toISOStringSafe(sale.deleted_at),
      seller: {
        id: seller.id,
        store_name: seller.store_name,
        email: seller.email,
        status: seller.status satisfies string as
          | "pending"
          | "approved"
          | "rejected"
          | "suspended",
        email_verified: seller.email_verified,
      },
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description:
          category.description === null ? undefined : category.description,
        image_url: category.image_url === null ? undefined : category.image_url,
        parent_id: category.parent_id === null ? undefined : category.parent_id,
        status: category.status,
        display_order: category.display_order,
        product_count: category.product_count,
        created_at: toISOStringSafe(category.created_at),
        updated_at: toISOStringSafe(category.updated_at),
      },
    },
    values: variantValues.map((v) => ({
      id: v.id,
      shopping_mall_sale_variant_attribute_id:
        v.shopping_mall_sale_variant_attribute_id,
      value: v.value,
      color_code: v.color_code === null ? undefined : v.color_code,
      display_order: v.display_order,
      created_at: toISOStringSafe(v.created_at),
    })),
    created_at: toISOStringSafe(variantAttribute.created_at),
  };
}
