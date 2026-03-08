import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallShipmentCollector {
  export async function collect(props: {
    body: IShoppingMallShipment.ICreate;
    seller: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      carrier_name: props.body.carrier_name,
      tracking_number: props.body.tracking_number,
      shipped_at: new Date(),
      delivered_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      seller: {
        connect: {
          id: props.seller.id,
        },
      },
      order: {
        connect: {
          id: props.body.order_id,
        },
      },
      // HasMany relation - connect existing order items
      orderItems: {
        connect: props.body.order_item_ids.map((itemId) => ({
          id: itemId,
        })),
      },
    } satisfies Prisma.shopping_mall_shipmentsCreateInput;
  }
}
