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

export async function postEcommerceCustomerCartsCartIdSnapshots(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCartSnapshot> {
  const cart = await MyGlobal.prisma.ecommerce_carts.findUnique({
    where: {
      id: props.cartId,
      customer: { id: props.customer.id },
      deleted_at: null,
    },
  });
  if (!cart) {
    throw new HttpException("Cart not found or doesn't belong to you", 404);
  }
  const snapshotId = v4();
  const createdSnapshot = await MyGlobal.prisma.ecommerce_cart_snapshots.create(
    {
      data: {
        id: snapshotId,
        ecommerce_cart_id: props.cartId,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    },
  );
  const snapshot = await MyGlobal.prisma.ecommerce_cart_snapshots.findUnique({
    where: { id: createdSnapshot.id },
    ...EcommerceCartSnapshotTransformer.select(),
  });
  if (!snapshot) {
    throw new HttpException("Snapshot not found", 404);
  }
  return EcommerceCartSnapshotTransformer.transform(snapshot);
}
