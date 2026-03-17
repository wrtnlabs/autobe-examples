import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallTrackingInfoCollector {
  export async function collect(props: {
    body: IShoppingMallTrackingInfo.ICreate;
    shipment: IEntity;
  }) {
    return {
      id: v4(),
      carrier_name: props.body.carrier_name,
      tracking_number: props.body.tracking_number,
      tracking_url: props.body.tracking_url ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      shipment: {
        connect: {
          id: props.shipment.id,
        },
      },
    } satisfies Prisma.shopping_mall_tracking_infosCreateInput;
  }
}
