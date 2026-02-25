import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleSnapshotTransformer } from "../transformers/ShoppingMallSaleSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerSalesSaleIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleSnapshot> {
  // Check ownership of the sale
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: props.saleId },
    select: { seller_id: true },
  });
  if (sale === null || sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the sale snapshot
  const snapshotRecord =
    await MyGlobal.prisma.shopping_mall_sale_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...ShoppingMallSaleSnapshotTransformer.select(),
    });
  if (snapshotRecord.shopping_mall_sale_id !== props.saleId) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return the snapshot DTO
  const snapshot =
    await ShoppingMallSaleSnapshotTransformer.transform(snapshotRecord);
  return snapshot;
}
