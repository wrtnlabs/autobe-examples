import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddressSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderAddressSnapshotTransformer } from "../transformers/ShoppingMallOrderAddressSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrdersOrderCodeAddressSnapshots(props: {
  customer: CustomerPayload;
  orderCode: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderAddressSnapshot> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      code: props.orderCode,
    },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_address_snapshots.findUniqueOrThrow(
      {
        where: {
          shopping_mall_order_id: order.id,
        },
        ...ShoppingMallOrderAddressSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallOrderAddressSnapshotTransformer.transform(snapshot);
}
