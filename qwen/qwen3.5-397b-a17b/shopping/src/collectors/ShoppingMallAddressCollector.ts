import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallAddressCollector {
  export async function collect(props: {
    body: IShoppingMallAddress.ICreate;
    customer: IEntity;
  }) {
    return {
      id: v4(),
      recipient_name: props.body.recipientName,
      recipient_phone: props.body.recipientPhone,
      street_address: props.body.streetAddress,
      city: props.body.city,
      state: props.body.state,
      postal_code: props.body.postalCode,
      country: props.body.country,
      is_default: props.body.isDefault ?? false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
    } satisfies Prisma.shopping_mall_addressesCreateInput;
  }
}
