import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductVariantSnapshotTransformer } from "../transformers/EcommerceMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminOrdersOrderIdItemsItemIdVariantSnapshots(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductVariantSnapshot.ISummary> {
  // Validate order exists
  await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  // Validate order item exists and belongs to the order, get variant_id
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { variant_id: true, order_id: true },
    });
  // Verify the order item belongs to the specified order
  if (orderItem.order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      400,
    );
  }
  // Build date filter conditions
  const createdAtConditions: Prisma.DateTimeFilter = {};
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtFrom !== null
  ) {
    createdAtConditions.gte = new Date(props.body.createdAtFrom);
  }
  if (props.body.createdAtTo !== undefined && props.body.createdAtTo !== null) {
    createdAtConditions.lte = new Date(props.body.createdAtTo);
  }
  const whereInput: Prisma.ecommerce_mall_product_variant_snapshotsWhereInput =
    {
      product_variant_id: orderItem.variant_id,
      ...(Object.keys(createdAtConditions).length > 0 && {
        created_at: createdAtConditions,
      }),
    } satisfies Prisma.ecommerce_mall_product_variant_snapshotsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallProductVariantSnapshotTransformer.select(),
    });
  // Count total
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.count({
      where: whereInput,
    });
  // Transform results and add variantId which is required by IEcommerceMallProductVariantSnapshot.ISummary
  const data = await ArrayUtil.asyncMap(snapshots, async (snapshot) => {
    const base =
      await EcommerceMallProductVariantSnapshotTransformer.transform(snapshot);
    // Convert optionValues array to record format
    const { optionValues, ...baseWithoutOptionValues } = base;
    const optionValuesRecord: Record<string, string> = {};
    if (Array.isArray(optionValues)) {
      for (const opt of optionValues) {
        if (opt && typeof opt === "object" && "name" in opt && "value" in opt) {
          optionValuesRecord[opt.name as string] = opt.value as string;
        }
      }
    }
    return {
      ...baseWithoutOptionValues,
      optionValues: optionValuesRecord,
      variantId: orderItem.variant_id satisfies string as string &
        tags.Format<"uuid">,
    } satisfies IEcommerceMallProductVariantSnapshot.ISummary;
  });
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
