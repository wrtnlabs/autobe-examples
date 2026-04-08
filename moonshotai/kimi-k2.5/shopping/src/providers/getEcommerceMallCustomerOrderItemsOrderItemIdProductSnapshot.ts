import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemProductSnapshotTransformer } from "../transformers/EcommerceMallOrderItemProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrderItemsOrderItemIdProductSnapshot(props: {
  customer: CustomerPayload;
  orderItemId: string;
}): Promise<IEcommerceMallOrderItemProductSnapshot> {
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: { id: props.orderItemId },
    select: {
      order: {
        select: { customer_id: true },
      },
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_product_snapshots.findUnique(
      {
        where: { order_item_id: props.orderItemId },
        ...EcommerceMallOrderItemProductSnapshotTransformer.select(),
      },
    );
  if (snapshot === null) {
    throw new HttpException("Product snapshot not found", 404);
  }
  return await EcommerceMallOrderItemProductSnapshotTransformer.transform(
    snapshot,
  );
}
