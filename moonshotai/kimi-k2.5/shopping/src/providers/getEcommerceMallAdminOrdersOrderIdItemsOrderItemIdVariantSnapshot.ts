import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallProductVariantSnapshotAtInvertTransformer } from "../transformers/EcommerceMallProductVariantSnapshotAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminOrdersOrderIdItemsOrderItemIdVariantSnapshot(props: {
  admin: AdminPayload;
  orderId: string;
  orderItemId: string;
}): Promise<IEcommerceMallProductVariantSnapshot.IInvert> {
  const orderItemSnapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findFirst({
      where: {
        orderItem: {
          id: props.orderItemId,
          order_id: props.orderId,
        },
      },
      select: {
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
        variantSnapshot:
          EcommerceMallProductVariantSnapshotAtInvertTransformer.select(),
      },
    });
  if (orderItemSnapshot === null) {
    throw new HttpException("Order item or variant snapshot not found", 404);
  }
  const variantSnapshot =
    await EcommerceMallProductVariantSnapshotAtInvertTransformer.transform(
      orderItemSnapshot.variantSnapshot,
    );
  const orderItemSummary =
    await EcommerceMallOrderItemAtSummaryTransformer.transform(
      orderItemSnapshot.orderItem,
    );
  return {
    ...variantSnapshot,
    orderItem: orderItemSummary,
  };
}
