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
    ecommerceMallCustomers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      recipient_name: props.body.recipient_name,
      recipient_phone: props.body.recipient_phone,
      street: props.body.street,
      city: props.body.city,
      state: props.body.state,
      is_default: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      orders: undefined,
      snapshots: undefined,
    } satisfies Prisma.ecommerce_mall_addressesCreateInput;
  }
}
