import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantSnapshotAtInvertTransformer } from "../transformers/EcommerceMallProductVariantSnapshotAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerOrdersOrderIdItemsOrderItemIdVariantSnapshot(props: {
  seller: SellerPayload;
  orderId: string;
  orderItemId: string;
}): Promise<IEcommerceMallProductVariantSnapshot.IInvert> {
  // Verify order exists
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  // Find order item
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      order_id: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      seller_id: true,
      snapshot: {
        select: {
          variantSnapshot:
            EcommerceMallProductVariantSnapshotAtInvertTransformer.select(),
        },
      },
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify seller owns this order item
  if (orderItem.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify snapshot exists
  if (
    orderItem.snapshot === null ||
    orderItem.snapshot.variantSnapshot === null
  ) {
    throw new HttpException("Variant snapshot not found", 404);
  }
  return await EcommerceMallProductVariantSnapshotAtInvertTransformer.transform(
    orderItem.snapshot.variantSnapshot,
  );
}
