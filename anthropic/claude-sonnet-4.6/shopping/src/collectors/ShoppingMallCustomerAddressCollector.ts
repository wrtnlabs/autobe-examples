import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCustomerAddressCollector {
  export async function collect(props: {
    body: IShoppingMallCustomerAddress.ICreate;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      recipient_name: props.body.recipientName,
      phone: props.body.phone,
      address_line1: props.body.addressLine1,
      address_line2: props.body.addressLine2 ?? null,
      city: props.body.city,
      state: props.body.state,
      postal_code: props.body.postalCode,
      country: props.body.country,
      is_default: props.body.isDefault,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.shoppingMallCustomers.id } },
    } satisfies Prisma.shopping_mall_customer_addressesCreateInput;
  }
}
