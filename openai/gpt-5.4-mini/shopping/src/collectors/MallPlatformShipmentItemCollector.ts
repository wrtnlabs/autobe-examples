import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformShipmentItemCollector {
  export async function collect(props: {
    body: IMallPlatformShipmentItem.ICreate;
    shipment: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      shipment: {
        connect: {
          id: props.shipment.id,
        },
      },
      orderItem: {
        connect: {
          id: props.body.orderItemId,
        },
      },
    } satisfies Prisma.mall_platform_shipment_itemsCreateInput;
  }
}
