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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallProductVariantSnapshotTransformer } from "../transformers/EcommerceMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrderItemsOrderItemIdVariantSnapshot(props: {
  customer: CustomerPayload;
  orderItemId: string;
}): Promise<IEcommerceMallProductVariantSnapshot> {
  // Query order item with ownership verification
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      order: {
        customer_id: props.customer.id,
      },
    },
    select: {
      id: true,
      variant_id: true,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found or access denied", 404);
  }
  // Retrieve the variant snapshot with option values
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUniqueOrThrow(
      {
        where: {
          id: orderItem.variant_id,
        },
        ...EcommerceMallProductVariantSnapshotTransformer.select(),
      },
    );
  return await EcommerceMallProductVariantSnapshotTransformer.transform(
    snapshot,
  );
}
