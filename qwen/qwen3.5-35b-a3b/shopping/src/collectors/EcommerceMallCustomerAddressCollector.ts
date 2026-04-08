import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallCustomerAddressCollector {
  export async function collect(props: {
    body: IEcommerceMallCustomerAddress.ICreate;
    ecommerceMallMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      recipient_name: props.body.recipient_name,
      phone: props.body.phone,
      street: props.body.street,
      city: props.body.city,
      state: props.body.state,
      postal_code: props.body.postal_code,
      country: props.body.country,
      is_default: props.body.is_default ?? false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.ecommerceMallMembers.id } },
    } satisfies Prisma.ecommerce_mall_customer_addressesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallCustomerAddressCollector {
//         export async function collect(props: {
//           body: IEcommerceMallCustomerAddress.ICreate;
//           ecommerceMallMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       recipient_name: ...,
//       phone: ...,
//       street: ...,
//       city: ...,
//       state: ...,
//       postal_code: ...,
//       country: ...,
//       is_default: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//       orders: ...,
//           } satisfies Prisma.ecommerce_mall_customer_addressesCreateInput;
//         }
//       }
//--------------------------------------------------------------