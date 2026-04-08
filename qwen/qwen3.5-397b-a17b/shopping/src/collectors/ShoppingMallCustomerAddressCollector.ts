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
    shoppingMallCustomerProfiles: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      recipient_name: props.body.recipient_name,
      recipient_phone: props.body.recipient_phone,
      street_address: props.body.street_address,
      city: props.body.city,
      state_province: props.body.state_province,
      postal_code: props.body.postal_code,
      country: props.body.country,
      is_default: props.body.is_default ?? false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customerProfile: {
        connect: { id: props.shoppingMallCustomerProfiles.id },
      },
    } satisfies Prisma.shopping_mall_customer_addressesCreateInput;
  }
}
