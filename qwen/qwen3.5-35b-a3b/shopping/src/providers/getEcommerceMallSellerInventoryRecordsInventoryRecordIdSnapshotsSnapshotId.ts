import { IEcommerceMallInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallInventorySnapshotTransformer } from "../transformers/EcommerceMallInventorySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerInventoryRecordsInventoryRecordIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  inventoryRecordId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallInventorySnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_inventory_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        inventory_record_id: props.inventoryRecordId,
      },
      ...EcommerceMallInventorySnapshotTransformer.select(),
    });
  const inventoryRecord =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findUniqueOrThrow({
      where: { id: props.inventoryRecordId },
      select: { ecommerce_mall_product_variant_id: true },
    });
  const productVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: inventoryRecord.ecommerce_mall_product_variant_id },
      select: {
        product: {
          select: { seller_id: true },
        },
      },
    });
  if (productVariant.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallInventorySnapshotTransformer.transform(snapshot);
}
