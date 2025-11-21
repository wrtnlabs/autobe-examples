import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrdersOrderNumberItems(props: {
  seller: SellerPayload;
  orderNumber: string;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  const sortBy = props.body.sortBy || "created_at";
  const order = props.body.order === "desc" ? "desc" : "asc";

  // Validate order exists and belongs to seller
  const orderRecord = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });

  if (!orderRecord) {
    throw new HttpException("Order not found or not accessible", 404);
  }

  // Build condition filters
  const whereConditions: Record<string, unknown> = {
    shopping_mall_order_id: orderRecord.id,
    deleted_at: null,
  };

  // Apply search filter if provided
  if (props.body.search) {
    whereConditions["notes"] = { contains: props.body.search };
  }

  // Apply variantId filter if provided
  if (props.body.variantId) {
    whereConditions["shopping_mall_product_variant_id"] = props.body.variantId;
  }

  // Apply minQuantity filter if provided
  if (props.body.minQuantity !== undefined) {
    whereConditions["quantity"] = { gte: props.body.minQuantity };
  }

  // Fetch order items with related product and variant data
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
      include: {
        productVariant: {
          // Use correct relationship name from schema
          include: {
            product: true, // Use correct nested relation name from schema
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({
      where: whereConditions,
    }),
  ]);

  // Map to ISummary type with proper null handling for relationships
  const summaryItems = items.map((item) => ({
    id: item.id,
    productId: item.productVariant?.product?.id || "",
    variantId: item.productVariant?.id || "",
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalAmount: item.item_total,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaryItems,
  };
}
