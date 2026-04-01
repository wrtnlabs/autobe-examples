import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartSnapshotTransformer } from "../transformers/ShoppingMallCartSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerCartItemsCartItemIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCartSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_cart_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_cart_item_id: props.cartItemId,
      },
      ...ShoppingMallCartSnapshotTransformer.select(),
    });
  if (snapshot.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallCartSnapshotTransformer.transform(snapshot);
}
