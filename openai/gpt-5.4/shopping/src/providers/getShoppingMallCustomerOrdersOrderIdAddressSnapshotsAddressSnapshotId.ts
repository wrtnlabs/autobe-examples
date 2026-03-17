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

export async function getShoppingMallCustomerOrdersOrderIdAddressSnapshotsAddressSnapshotId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  addressSnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderAddressSnapshot> {
  await MyGlobal.prisma.shopping_mall_orders.findFirstOrThrow({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
    },
    select: {
      id: true,
    },
  });
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_address_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.addressSnapshotId,
          shopping_mall_order_id: props.orderId,
        },
        ...ShoppingMallOrderAddressSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallOrderAddressSnapshotTransformer.transform(snapshot);
}
