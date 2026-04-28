import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommercePlatformShippingAddressCollector {
  export async function collect(props: {
    body: IEcommercePlatformShippingAddress.ICreate;
    ecommercePlatformCustomerProfiles: IEntity;
  }) {
    return {
      id: v4(),
      recipient_name: props.body.recipientName,
      phone_number: props.body.phoneNumber ?? "",
      street_address: props.body.streetAddress,
      city: props.body.city,
      state: props.body.state,
      postal_code: props.body.postalCode,
      country: props.body.country,
      is_default: props.body.isDefault,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customerProfile: {
        connect: { id: props.ecommercePlatformCustomerProfiles.id },
      },
    } satisfies Prisma.ecommerce_platform_shipping_addressesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformShippingAddressCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformShippingAddress.ICreate;
//           ecommercePlatformCustomerProfiles: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       recipient_name: ...,
//       phone_number: ...,
//       street_address: ...,
//       city: ...,
//       state: ...,
//       postal_code: ...,
//       country: ...,
//       is_default: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customerProfile: ...,
//       orders: ...,
//           } satisfies Prisma.ecommerce_platform_shipping_addressesCreateInput;
//         }
//       }
//--------------------------------------------------------------