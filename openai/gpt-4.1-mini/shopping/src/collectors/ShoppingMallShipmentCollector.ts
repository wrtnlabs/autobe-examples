import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(
  date: Date,
): string & import("typia").tags.Format<"date-time"> {
  return date.toISOString() as string &
    import("typia").tags.Format<"date-time">;
}
export namespace ShoppingMallShipmentCollector {
  export async function collect(props: {
    body: IShoppingMallShipment.ICreate;
    seller: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      status: "pending",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      seller: { connect: { id: props.seller.id } },
    } satisfies Prisma.shopping_mall_shipmentsCreateInput;
  }
}
