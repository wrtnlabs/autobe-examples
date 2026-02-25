import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceOrderSnapshotTransformer } from "../transformers/EcommerceOrderSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerOrdersOrderIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceOrderSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_order_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...EcommerceOrderSnapshotTransformer.select(),
    });
  if (snapshot.order.id !== props.orderId) {
    throw new HttpException("Snapshot does not belong to this order", 404);
  }
  await MyGlobal.prisma.ecommerce_orders.findFirstOrThrow({
    where: { id: props.orderId, customer_id: props.customer.id },
  });
  return await EcommerceOrderSnapshotTransformer.transform(snapshot);
}
