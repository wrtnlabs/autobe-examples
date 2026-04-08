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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceOrderItemSnapshotVariantOptionAtSummaryTransformer } from "../transformers/EcommerceOrderItemSnapshotVariantOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminOrdersOrderIdItemsItemIdSnapshotVariantOptions(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceOrderItemSnapshotVariantOption.IRequest;
}): Promise<IPageIEcommerceOrderItemSnapshotVariantOption.ISummary> {
  // Validate order item exists and belongs to the specified order
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { ecommerce_order_id: true },
    });
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException("Order item not found in specified order", 404);
  }
  // Load snapshot chain: order item → snapshot → variant
  const snapshot =
    await MyGlobal.prisma.ecommerce_order_item_snapshots.findFirstOrThrow({
      where: { ecommerce_order_item_id: props.itemId },
      select: { id: true },
    });
  const variant =
    await MyGlobal.prisma.ecommerce_order_item_snapshot_variants.findFirstOrThrow(
      {
        where: { ecommerce_order_item_snapshot_id: snapshot.id },
        select: { id: true },
      },
    );
  // Build where clause with optional key filter
  const whereInput: Prisma.ecommerce_order_item_snapshot_variant_optionsWhereInput =
    {
      ecommerce_order_item_snapshot_variant_id: variant.id,
      ...(props.body.key && { key: props.body.key }),
    };
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const offset = props.body.offset ?? (page - 1) * limit;
  // Query options with pagination
  const records =
    await MyGlobal.prisma.ecommerce_order_item_snapshot_variant_options.findMany(
      {
        where: whereInput,
        skip: offset,
        take: limit,
        orderBy: { created_at: "desc" },
        ...EcommerceOrderItemSnapshotVariantOptionAtSummaryTransformer.select(),
      },
    );
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.ecommerce_order_item_snapshot_variant_options.count({
      where: whereInput,
    });
  // Transform and return paginated results
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceOrderItemSnapshotVariantOptionAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceOrderItemSnapshotVariantOption.ISummary;
}
