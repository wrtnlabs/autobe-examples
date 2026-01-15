import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderAddressCollector {
  export async function collect(props: {
    body: IShoppingMallOrderAddress.ICreate;
    shoppingMallOrders: IEntity;
  }) {
    return {
      id: v4(),
      address_line1: props.body.addressLine1,
      address_line2: props.body.addressLine2 ?? null,
      city: props.body.city,
      state: props.body.region,
      postal_code: props.body.postalCode,
      country: props.body.country,
      phone: props.body.phone,
      email: "",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      order: {
        connect: { id: props.shoppingMallOrders.id },
      },
    } satisfies Prisma.shopping_mall_order_addressesCreateInput;
  }
}
