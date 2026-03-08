import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductSnapshotTransformer } from "../transformers/EcommerceMallProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallProductsProductIdSnapshotsSnapshotId(props: {
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  authenticatedActor:
    | IEcommerceMallSeller
    | {
        admin: boolean;
      }
    | null;
}): Promise<IEcommerceMallProductSnapshot> {
  // Query snapshot with nested relations using transformer's select
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        product_id: props.productId,
      },
      ...EcommerceMallProductSnapshotTransformer.select(),
    });
  // Authorization check
  if (!props.authenticatedActor) {
    throw new HttpException("Forbidden", 403);
  }
  if ("admin" in props.authenticatedActor && props.authenticatedActor.admin) {
    // Admin access granted
  } else if ("id" in props.authenticatedActor) {
    // Seller can only view snapshots of their own products
    const sellerId = snapshot.product.seller.id;
    const authenticatedSellerId = props.authenticatedActor.id;
    if (sellerId !== authenticatedSellerId) {
      throw new HttpException("Forbidden", 403);
    }
  } else {
    // Customers or unauthenticated users cannot view snapshots
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return the snapshot
  return await EcommerceMallProductSnapshotTransformer.transform(snapshot);
}
