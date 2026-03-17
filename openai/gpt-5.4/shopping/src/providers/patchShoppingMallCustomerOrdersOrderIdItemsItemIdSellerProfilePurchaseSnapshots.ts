import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfilePurchaseSnapshot";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSellerProfilePurchaseSnapshotTransformer } from "../transformers/ShoppingMallSellerProfilePurchaseSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrdersOrderIdItemsItemIdSellerProfilePurchaseSnapshots(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerProfilePurchaseSnapshot.IRequest;
}): Promise<IPageIShoppingMallSellerProfilePurchaseSnapshot> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirstOrThrow({
    where: {
      code: props.orderId,
    },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow(
    {
      where: {
        id: props.itemId,
        shopping_mall_order_id: order.id,
      },
      select: {
        id: true,
      },
    },
  );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderBy =
    props.body.sort === "created_at_asc"
      ? ([
          { created_at: "asc" },
          { id: "asc" },
        ] satisfies Prisma.shopping_mall_seller_profile_purchase_snapshotsOrderByWithRelationInput[])
      : props.body.sort === "created_at_desc"
        ? ([
            { created_at: "desc" },
            { id: "asc" },
          ] satisfies Prisma.shopping_mall_seller_profile_purchase_snapshotsOrderByWithRelationInput[])
        : props.body.sort === "id_asc"
          ? ([
              { id: "asc" },
            ] satisfies Prisma.shopping_mall_seller_profile_purchase_snapshotsOrderByWithRelationInput[])
          : props.body.sort === "id_desc"
            ? ([
                { id: "desc" },
              ] satisfies Prisma.shopping_mall_seller_profile_purchase_snapshotsOrderByWithRelationInput[])
            : ([
                { created_at: "desc" },
                { id: "asc" },
              ] satisfies Prisma.shopping_mall_seller_profile_purchase_snapshotsOrderByWithRelationInput[]);
  const where = {
    shopping_mall_order_item_id: item.id,
  } satisfies Prisma.shopping_mall_seller_profile_purchase_snapshotsWhereInput;
  const rows =
    await MyGlobal.prisma.shopping_mall_seller_profile_purchase_snapshots.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy,
        ...ShoppingMallSellerProfilePurchaseSnapshotTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.shopping_mall_seller_profile_purchase_snapshots.count(
      {
        where,
      },
    );
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      ShoppingMallSellerProfilePurchaseSnapshotTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
