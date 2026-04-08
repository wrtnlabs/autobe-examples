import { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceOrderItemSnapshotTransformer } from "../transformers/EcommerceOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminOrdersOrderIdItemsItemIdSnapshot(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceOrderItemSnapshot> {
  await MyGlobal.prisma.ecommerce_order_items.findFirstOrThrow({
    where: {
      id: props.itemId,
      ecommerce_order_id: props.orderId,
    },
    select: {
      id: true,
    },
  });
  const snapshot =
    await MyGlobal.prisma.ecommerce_order_item_snapshots.findFirstOrThrow({
      where: {
        ecommerce_order_item_id: props.itemId,
      },
      ...EcommerceOrderItemSnapshotTransformer.select(),
    });
  return await EcommerceOrderItemSnapshotTransformer.transform(snapshot);
}
