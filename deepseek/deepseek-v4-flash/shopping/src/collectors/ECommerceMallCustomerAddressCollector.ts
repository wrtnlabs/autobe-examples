import { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ECommerceMallCustomerAddressCollector {
  export async function collect(props: {
    body: IECommerceMallCustomerAddress.ICreate;
    eCommerceMallCustomers: IEntity;
    eCommerceMallCustomerSessions: IEntity;
  }) {
    const isDefault: boolean =
      props.body.is_default ??
      (await MyGlobal.prisma.e_commerce_mall_customer_addresses.findFirst({
        where: {
          e_commerce_mall_customer_id: props.eCommerceMallCustomers.id,
          deleted_at: null,
        },
      })) === null;
    return {
      id: v4(),
      recipient_name: props.body.recipient_name,
      phone_number: props.body.phone_number,
      street_address: props.body.street_address,
      city: props.body.city,
      state_province: props.body.state_province,
      postal_code: props.body.postal_code,
      country: props.body.country,
      is_default: isDefault,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.eCommerceMallCustomers.id } },
    } satisfies Prisma.e_commerce_mall_customer_addressesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ECommerceMallCustomerAddressCollector {
//         export async function collect(props: {
//           body: IECommerceMallCustomerAddress.ICreate;
//           eCommerceMallCustomers: IEntity; // from authorized actor
// eCommerceMallCustomerSessions: IEntity; // from authorized session
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
//           } satisfies Prisma.e_commerce_mall_customer_addressesCreateInput;
//         }
//       }
//--------------------------------------------------------------