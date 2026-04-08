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
      recipient_name: props.body.recipient_name,
      phone_number: props.body.phone_number,
      street_address: props.body.street_address,
      city: props.body.city,
      state_province: props.body.state_province,
      postal_code: props.body.postal_code,
      country: props.body.country,
      is_default: props.body.is_default,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
    } satisfies Prisma.mall_platform_shipping_addressesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformShippingAddressCollector {
//         export async function collect(props: {
//           body: IMallPlatformShippingAddress.ICreate;
//           mallPlatformCustomers: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       recipient_name: ...,
//       phone_number: ...,
//       street_address: ...,
//       city: ...,
//       state_province: ...,
//       postal_code: ...,
//       country: ...,
//       is_default: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//           } satisfies Prisma.mall_platform_shipping_addressesCreateInput;
//         }
//       }
//--------------------------------------------------------------