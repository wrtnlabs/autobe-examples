import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrdersOrderIdItemsItemIdSnapshots(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItemSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderItemSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    order_item_id: props.itemId,
    deleted_at: null,
  } satisfies Prisma.ecommerce_mall_order_item_snapshotsWhereInput;
  await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
    where: {
      id: props.itemId,
      ecommerce_mall_order_id: props.orderId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const data =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "asc" },
      ...EcommerceMallOrderItemSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.count(
    {
      where: whereInput,
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallOrderItemSnapshotAtSummaryTransformer.transform,
    ),
  };
}
