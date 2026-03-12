import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallRefundSnapshotTransformer } from "../transformers/ShoppingMallRefundSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_refund_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_refund_request_id: props.refundRequestId,
      },
      ...ShoppingMallRefundSnapshotTransformer.select(),
    });
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: {
        id: props.refundRequestId,
      },
      select: {
        shopping_mall_order_item_id: true,
      },
    });
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: refundRequest.shopping_mall_order_item_id,
      },
      select: {
        shopping_mall_seller_id: true,
      },
    });
  if (orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallRefundSnapshotTransformer.transform(snapshot);
}
