import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantSnapshotTransformer } from "../transformers/EcommerceMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerOrderItemsOrderItemIdVariantSnapshot(props: {
  seller: SellerPayload;
  orderItemId: string;
}): Promise<IEcommerceMallProductVariantSnapshot> {
  // First verify order item exists and seller owns it
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: props.orderItemId,
      },
      select: {
        seller_id: true,
      },
    });
  if (orderItem.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Get the variant snapshot ID from order item snapshots junction
  const orderItemSnapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findFirstOrThrow({
      where: {
        order_item_id: props.orderItemId,
      },
      select: {
        variant_snapshot_id: true,
      },
    });
  // Fetch the variant snapshot with full details using transformer select
  const variantSnapshot =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUniqueOrThrow(
      {
        where: {
          id: orderItemSnapshot.variant_snapshot_id,
        },
        ...EcommerceMallProductVariantSnapshotTransformer.select(),
      },
    );
  return await EcommerceMallProductVariantSnapshotTransformer.transform(
    variantSnapshot,
  );
}
