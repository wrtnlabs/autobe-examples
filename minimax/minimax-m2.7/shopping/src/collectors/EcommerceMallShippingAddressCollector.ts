import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallShippingAddressCollector {
  export async function collect(props: {
    body: IEcommerceMallShippingAddress.ICreate;
    ecommerceMallCustomers: IEntity;
    ecommerceMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      recipient_name: props.body.recipient_name,
      phone: props.body.phone,
      street_address: props.body.street_address,
      city: props.body.city,
      state: props.body.state,
      postal_code: props.body.postal_code,
      country: props.body.country,
      is_default: props.body.is_default ?? false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
    } satisfies Prisma.ecommerce_mall_shipping_addressesCreateInput;
  }
}
