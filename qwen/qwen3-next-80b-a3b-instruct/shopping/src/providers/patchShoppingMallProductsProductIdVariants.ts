import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
  };

  // Price filtering
  if (props.body.min_price !== undefined) {
    whereCondition.price = {
      ...((whereCondition.price as Record<string, unknown>) || {}),
      gte: props.body.min_price,
    };
  }
  if (props.body.max_price !== undefined) {
    whereCondition.price = {
      ...((whereCondition.price as Record<string, unknown>) || {}),
      lte: props.body.max_price,
    };
  }

  // Inventory filtering
  if (props.body.min_inventory !== undefined) {
    whereCondition.inventory_count = {
      ...((whereCondition.inventory_count as Record<string, unknown>) || {}),
      gte: props.body.min_inventory,
    };
  }

  // Attribute filtering
  if (props.body.attribute_filters) {
    try {
      const attrFilters = JSON.parse(props.body.attribute_filters);
      for (const [key, value] of Object.entries(attrFilters)) {
        whereCondition.attributes = {
          ...((whereCondition.attributes as Record<string, unknown>) || {}),
          contains: JSON.stringify({ [key]: value }),
        };
      }
    } catch (e) {
      throw new HttpException("Invalid attribute_filters format", 400);
    }
  }

  // Sorting
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (props.body.sort_by) {
    orderBy[props.body.sort_by] =
      props.body.sort_order === "desc" ? "desc" : "asc";
  } else {
    orderBy.created_at = "desc";
  }

  const [variants, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_product_variants.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: variants.map((variant) => ({
      id: variant.id,
      title: variant.title,
      price: variant.price,
      sku: variant.sku,
      inventory_count: variant.inventory_count,
      attributes: variant.attributes,
      created_at: toISOStringSafe(variant.created_at),
      updated_at: toISOStringSafe(variant.updated_at),
      deleted_at: variant.deleted_at
        ? toISOStringSafe(variant.deleted_at)
        : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
