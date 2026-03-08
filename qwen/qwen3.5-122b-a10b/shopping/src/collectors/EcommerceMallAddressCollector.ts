import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallAddressCollector {
  export async function collect(props: {
    body: IEcommerceMallAddress.ICreate;
    ecommerceMallCustomer: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      recipient_name: props.body.recipient_name,
      phone_number: props.body.phone_number,
      street_address: props.body.street_address,
      city: props.body.city,
      state_province: props.body.state_province,
      postal_code: props.body.postal_code,
      country: props.body.country,
      is_default: props.body.is_default ?? false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.ecommerceMallCustomer.id } },
    } satisfies Prisma.ecommerce_mall_addressesCreateInput;
  }
}
