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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceOrderSnapshotTransformer } from "../transformers/EcommerceOrderSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminOrdersOrderIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceOrderSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_order_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        ...EcommerceOrderSnapshotTransformer.select().select,
        ecommerce_order_id: true,
      },
    });
  if (snapshot.ecommerce_order_id !== props.orderId) {
    throw new HttpException(
      "Snapshot does not belong to the specified order",
      404,
    );
  }
  return await EcommerceOrderSnapshotTransformer.transform(snapshot);
}
