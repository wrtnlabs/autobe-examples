import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderSnapshotTransformer } from "../transformers/EcommerceMallOrderSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrdersOrderIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        ecommerce_mall_order_id: props.orderId,
      },
      ...EcommerceMallOrderSnapshotTransformer.select(),
    });
  if (snapshot.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallOrderSnapshotTransformer.transform(snapshot);
}
