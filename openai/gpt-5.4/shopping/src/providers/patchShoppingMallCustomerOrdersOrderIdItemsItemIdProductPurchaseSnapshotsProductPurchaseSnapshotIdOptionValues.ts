import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductPurchaseSnapshotOptionValue";
import { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductPurchaseSnapshotOptionValueAtSummaryTransformer } from "../transformers/ShoppingMallProductPurchaseSnapshotOptionValueAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshotsProductPurchaseSnapshotIdOptionValues(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  productPurchaseSnapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductPurchaseSnapshotOptionValue.IRequest;
}): Promise<IPageIShoppingMallProductPurchaseSnapshotOptionValue.ISummary> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.shopping_mall_product_purchase_snapshots.findFirstOrThrow(
    {
      where: {
        id: props.productPurchaseSnapshotId,
        shopping_mall_order_item_id: props.itemId,
      },
      select: {
        id: true,
      },
    },
  );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    shopping_mall_product_purchase_snapshot_id: props.productPurchaseSnapshotId,
    deleted_at: null,
    ...(props.body.option_name !== undefined
      ? {
          option_name: {
            contains: props.body.option_name,
          },
        }
      : {}),
    ...(props.body.option_value !== undefined
      ? {
          option_value: {
            contains: props.body.option_value,
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_product_purchase_snapshot_option_valuesWhereInput;
  const orderBy = (
    props.body.sort === "option_name_asc"
      ? [{ option_name: "asc" }, { display_order: "asc" }]
      : props.body.sort === "option_name_desc"
        ? [{ option_name: "desc" }, { display_order: "asc" }]
        : props.body.sort === "option_value_asc"
          ? [{ option_value: "asc" }, { display_order: "asc" }]
          : props.body.sort === "option_value_desc"
            ? [{ option_value: "desc" }, { display_order: "asc" }]
            : props.body.sort === "created_at_asc"
              ? [{ display_order: "asc" }, { created_at: "asc" }]
              : props.body.sort === "created_at_desc"
                ? [{ display_order: "asc" }, { created_at: "desc" }]
                : [{ display_order: "asc" }, { created_at: "asc" }]
  ) satisfies Prisma.shopping_mall_product_purchase_snapshot_option_valuesOrderByWithRelationInput[];
  const data =
    await MyGlobal.prisma.shopping_mall_product_purchase_snapshot_option_values.findMany(
      {
        where,
        orderBy,
        skip,
        take: limit,
        ...ShoppingMallProductPurchaseSnapshotOptionValueAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.shopping_mall_product_purchase_snapshot_option_values.count(
      {
        where,
      },
    );
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductPurchaseSnapshotOptionValueAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
