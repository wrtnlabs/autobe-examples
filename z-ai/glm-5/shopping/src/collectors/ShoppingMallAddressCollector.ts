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
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      recipient_name: props.body.recipientName,
      phone_number: props.body.phoneNumber,
      street_address: props.body.streetAddress,
      city: props.body.city,
      state_province: props.body.stateProvince,
      postal_code: props.body.postalCode,
      country: props.body.country,
      is_default: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.shoppingMallCustomers.id } },
    } satisfies Prisma.shopping_mall_addressesCreateInput;
  }
}
