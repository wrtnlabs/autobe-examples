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
    const now: Date = new Date();
    // Determine is_default by checking if customer already has a default address
    const existingDefault =
      await MyGlobal.prisma.ecommerce_mall_addresses.findFirst({
        where: {
          ecommerce_mall_customer_id: props.ecommerceMallCustomers.id,
          is_default: true,
          deleted_at: null,
        },
      });
    const is_default: boolean = !existingDefault;
    return {
      id,
      recipient_name: props.body.recipient_name,
      recipient_phone: props.body.recipient_phone,
      street: props.body.street,
      city: props.body.city,
      state: props.body.state,
      is_default,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      customer: {
        connect: {
          id: props.ecommerceMallCustomers.id,
        },
      },
    } satisfies Prisma.ecommerce_mall_addressesCreateInput;
  }
}
