import { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import { IEcommerceCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartSnapshot";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCartSnapshotTransformer } from "../transformers/EcommerceCartSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerCartsCartIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCartSnapshot> {
  const snapshot = await MyGlobal.prisma.ecommerce_cart_snapshots.findUnique({
    where: {
      id: props.snapshotId,
      ecommerce_cart_id: props.cartId,
      deleted_at: null,
    },
    ...EcommerceCartSnapshotTransformer.select(),
  });
  if (!snapshot) {
    throw new HttpException("Snapshot not found", 404);
  }
  return await EcommerceCartSnapshotTransformer.transform(snapshot);
}
