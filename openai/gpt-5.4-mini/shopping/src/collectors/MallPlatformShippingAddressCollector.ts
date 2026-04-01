import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformShippingAddressCollector {
  export async function collect(props: {
    body: IMallPlatformShippingAddress.ICreate;
    customer: IEntity;
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
      is_default: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      customer: {
        connect: {
          id: props.customer.id,
        },
      },
    } satisfies Prisma.mall_platform_shipping_addressesCreateInput;
  }
}
