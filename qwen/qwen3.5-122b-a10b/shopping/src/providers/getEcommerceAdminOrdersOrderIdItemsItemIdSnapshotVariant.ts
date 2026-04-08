import { IEcommerceOrderItemSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariant";
import { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceOrderItemSnapshotVariantTransformer } from "../transformers/EcommerceOrderItemSnapshotVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminOrdersOrderIdItemsItemIdSnapshotVariant(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceOrderItemSnapshotVariant> {
  // First, verify the order item exists and belongs to the specified order
  await MyGlobal.prisma.ecommerce_order_items.findFirstOrThrow({
    where: {
      id: props.itemId,
      ecommerce_order_id: props.orderId,
    },
    select: {
      id: true,
    },
  });
  // Query the order item snapshot using the order item ID
  const orderItemSnapshot =
    await MyGlobal.prisma.ecommerce_order_item_snapshots.findFirstOrThrow({
      where: {
        ecommerce_order_item_id: props.itemId,
      },
      select: {
        id: true,
      },
    });
  // Query the variant snapshot with all required fields and nested options
  const variantSnapshot =
    await MyGlobal.prisma.ecommerce_order_item_snapshot_variants.findFirstOrThrow(
      {
        where: {
          ecommerce_order_item_snapshot_id: orderItemSnapshot.id,
        },
        ...EcommerceOrderItemSnapshotVariantTransformer.select(),
      },
    );
  return await EcommerceOrderItemSnapshotVariantTransformer.transform(
    variantSnapshot,
  );
}
