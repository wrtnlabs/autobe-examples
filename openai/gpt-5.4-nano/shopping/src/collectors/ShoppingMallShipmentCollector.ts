import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { ShoppingMallShipmentConfirmationCollector } from "./ShoppingMallShipmentConfirmationCollector";

export namespace ShoppingMallShipmentCollector {
  export async function collect(props: {
    body: IShoppingMallShipment.ICreate;
  }) {
    const id: string = v4();
    const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany(
      {
        where: {
          id: {
            in: props.body.shopping_mall_order_item_ids,
          },
        },
        select: {
          id: true,
          seller_snapshot_id: true,
        },
      },
    );
    // Validate existence & consistency
    if (orderItems.length !== props.body.shopping_mall_order_item_ids.length) {
      throw new Error(
        "Some shopping_mall_order_items not found for the provided ids.",
      );
    }
    const sellerSnapshotId = orderItems[0]?.seller_snapshot_id;
    if (!sellerSnapshotId) {
      throw new Error("Unable to derive seller_snapshot_id from order items.");
    }
    for (const item of orderItems) {
      if (item.seller_snapshot_id !== sellerSnapshotId) {
        throw new Error(
          "Selected shopping_mall_order_item_ids must belong to the same seller_snapshot_id.",
        );
      }
    }
    return {
      id,
      order: {
        connect: {
          id: props.body.shopping_mall_order_id,
        },
      },
      seller_snapshot_id: sellerSnapshotId,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      shipmentConfirmation:
        props.body.shipment_confirmation === null
          ? undefined
          : {
              create: await ShoppingMallShipmentConfirmationCollector.collect({
                body: props.body.shipment_confirmation,
              }),
            },
    } satisfies Prisma.shopping_mall_shipmentsCreateInput;
  }
}
