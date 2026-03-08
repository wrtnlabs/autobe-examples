import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
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

export async function getShoppingMallSellerDashboard(props: {
  seller: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "seller";
  };
}): Promise<IShoppingMallSellerDashboard> {
  const LOW_STOCK_THRESHOLD = 10;
  const productsCount = await MyGlobal.prisma.shopping_mall_products.count({
    where: {
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  const orderItemsCount = await MyGlobal.prisma.shopping_mall_order_items.count(
    {
      where: {
        shopping_mall_seller_id: props.seller.id,
      },
    },
  );
  const pendingCancellationsCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        shopping_mall_seller_id: props.seller.id,
        status: "pending",
      },
    });
  const pendingRefundsCount =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        status: "pending",
        orderItem: {
          shopping_mall_seller_id: props.seller.id,
        },
      },
    });
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        deleted_at: null,
        product: {
          shopping_mall_seller_id: props.seller.id,
          deleted_at: null,
        },
      },
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        inventoryRecords: {
          select: {
            quantity_change: true,
          },
        },
      },
    });
  const lowStockVariants: IShoppingMallSellerDashboard.ILowStockVariant[] = [];
  for (const variant of variants) {
    const stock = variant.inventoryRecords.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    if (stock < LOW_STOCK_THRESHOLD) {
      lowStockVariants.push({
        product: {
          id: variant.product.id,
          name: variant.product.name,
        },
        variant: {
          id: variant.id,
          skuCode: variant.sku_code,
          optionValues: JSON.parse(variant.option_values),
        },
        stock,
      });
    }
  }
  return {
    products_count: productsCount,
    order_items_count: orderItemsCount,
    pending_cancellations_count: pendingCancellationsCount,
    pending_refunds_count: pendingRefundsCount,
    low_stock_variants: lowStockVariants,
  };
}
