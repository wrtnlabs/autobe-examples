import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted: false,
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
  if (!variant) {
    throw new HttpException(
      "Variant not found or does not belong to product",
      404,
    );
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_seller_id: props.seller.id,
      deleted: false,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 403);
  }
  const whereInput = {
    product_variant_id: props.variantId,
    ...(props.body.reason && { reason: props.body.reason }),
    ...(props.body.from && { created_at: { gte: new Date(props.body.from) } }),
    ...(props.body.to && { created_at: { lte: new Date(props.body.to) } }),
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  const orderByInput = (() => {
    if (!props.body.sort) {
      return { created_at: "desc" as const };
    }
    const [field, direction = "desc"] = props.body.sort.split(",");
    if (field === "created_at") {
      return { created_at: direction === "asc" ? "asc" : "desc" } as const;
    }
    return { created_at: "desc" as const };
  })() satisfies Prisma.shopping_mall_inventory_recordsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      quantity_change: true,
      reason: true,
      reference_id: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((record) => {
      return {
        id: record.id,
        quantity_change: record.quantity_change,
        reason: record.reason,
        reference_id: record.reference_id ?? undefined,
        created_at: record.created_at.toISOString(),
      } satisfies IShoppingMallInventoryRecord.ISummary;
    }),
  };
}
