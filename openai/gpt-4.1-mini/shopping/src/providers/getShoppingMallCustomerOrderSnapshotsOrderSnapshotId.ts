import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderSnapshotTransformer } from "../transformers/ShoppingMallOrderSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrderSnapshotsOrderSnapshotId(props: {
  customer: CustomerPayload;
  orderSnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderSnapshot> {
  const snapshotRaw =
    await MyGlobal.prisma.shopping_mall_order_snapshots.findUniqueOrThrow({
      where: { id: props.orderSnapshotId },
      include: {
        order: {
          select: { id: true, shopping_mall_customer_id: true },
        },
      },
    });
  if (snapshotRaw.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Pass the snapshotRaw directly as transformer expects Date types, not strings
  return await ShoppingMallOrderSnapshotTransformer.transform(snapshotRaw);
}
