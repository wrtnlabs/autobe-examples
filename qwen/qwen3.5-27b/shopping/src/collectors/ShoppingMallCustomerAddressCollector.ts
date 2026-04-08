import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCustomerAddressCollector {
  export async function collect(props: {
    body: IShoppingMallCustomerAddress.ICreate;
    shoppingMallCustomers: IEntity;
  }) {
    return {
      id: v4(),
      recipient_name: props.body.recipient_name,
      phone_number: props.body.phone_number,
      street_address: props.body.street_address,
      city: props.body.city,
      state_province: props.body.state_province ?? null,
      postal_code: props.body.postal_code,
      country: props.body.country,
      is_default: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.shoppingMallCustomers.id } },
    } satisfies Prisma.shopping_mall_customer_addressesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallCustomerAddressCollector {
//         export async function collect(props: {
//           body: IShoppingMallCustomerAddress.ICreate;
//           shoppingMallCustomers: IEntity; // from authorized actor
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
//       orders: ...,
//           } satisfies Prisma.shopping_mall_customer_addressesCreateInput;
//         }
//       }
//--------------------------------------------------------------