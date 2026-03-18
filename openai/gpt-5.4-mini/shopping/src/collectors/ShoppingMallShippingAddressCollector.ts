import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallShippingAddressCollector {
  export async function collect(props: {
    body: IShoppingMallShippingAddress.ICreate;
    customerProfile: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      recipient_name: props.body.recipientName,
      phone_number: props.body.phoneNumber,
      street_address: props.body.streetAddress,
      city: props.body.city,
      state_province: props.body.stateProvince,
      postal_code: props.body.postalCode,
      country: props.body.country,
      is_default: props.body.isDefault,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      customerProfile: { connect: { id: props.customerProfile.id } },
    } satisfies Prisma.shopping_mall_shipping_addressesCreateInput;
  }
}
