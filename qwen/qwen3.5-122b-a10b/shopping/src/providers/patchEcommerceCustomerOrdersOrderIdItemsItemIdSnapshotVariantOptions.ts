import { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceOrderItemSnapshotVariantOptionAtSummaryTransformer } from "../transformers/EcommerceOrderItemSnapshotVariantOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerOrdersOrderIdItemsItemIdSnapshotVariantOptions(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceOrderItemSnapshotVariantOption.IRequest;
}): Promise<IPageIEcommerceOrderItemSnapshotVariantOption.ISummary> {
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: {
        id: props.itemId,
        ecommerce_order_id: props.orderId,
      },
      select: {
        ecommerce_order_id: true,
      },
    });
  const order = await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: {
      id: orderItem.ecommerce_order_id,
    },
    select: {
      ecommerce_customer_id: true,
    },
  });
  if (order.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.ecommerce_order_item_snapshots.findFirst({
      where: {
        ecommerce_order_item_id: props.itemId,
      },
      select: {
        id: true,
      },
    });
  if (!snapshot) {
    throw new HttpException("Not Found", 404);
  }
  const variantSnapshot =
    await MyGlobal.prisma.ecommerce_order_item_snapshot_variants.findFirst({
      where: {
        ecommerce_order_item_snapshot_id: snapshot.id,
      },
      select: {
        id: true,
      },
    });
  if (!variantSnapshot) {
    throw new HttpException("Not Found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const offset = (page - 1) * limit;
  const whereInput = {
    ecommerce_order_item_snapshot_variant_id: variantSnapshot.id,
    deleted_at: null,
    ...(props.body.key !== undefined && { key: props.body.key }),
  } satisfies Prisma.ecommerce_order_item_snapshot_variant_optionsWhereInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_order_item_snapshot_variant_options.findMany({
      where: whereInput,
      skip: offset,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceOrderItemSnapshotVariantOptionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_order_item_snapshot_variant_options.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceOrderItemSnapshotVariantOptionAtSummaryTransformer.transform,
    ),
  };
}
