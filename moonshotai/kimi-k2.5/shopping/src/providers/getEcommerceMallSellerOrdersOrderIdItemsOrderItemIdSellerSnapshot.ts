import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemSellerSnapshotTransformer } from "../transformers/EcommerceMallOrderItemSellerSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerOrdersOrderIdItemsOrderItemIdSellerSnapshot(props: {
  seller: SellerPayload;
  orderId: string;
  orderItemId: string;
}): Promise<IEcommerceMallOrderItemSellerSnapshot> {
  // Verify the order item exists and belongs to this seller
  await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
    where: {
      id: props.orderItemId,
      order_id: props.orderId,
      seller_id: props.seller.id,
    },
    select: {
      id: true,
    },
  });
  // Retrieve the seller snapshot for this order item
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_seller_snapshots.findFirstOrThrow(
      {
        where: {
          order_item_id: props.orderItemId,
        },
        ...EcommerceMallOrderItemSellerSnapshotTransformer.select(),
      },
    );
  return await EcommerceMallOrderItemSellerSnapshotTransformer.transform(
    snapshot,
  );
}
