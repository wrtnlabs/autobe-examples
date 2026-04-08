import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallShippingAddressTransformer {
  export type Payload = Prisma.ecommerce_mall_shipping_addressesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        recipient_name: true,
        phone: true,
        street_address: true,
        city: true,
        state: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        orders: true,
      },
    } satisfies Prisma.ecommerce_mall_shipping_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShippingAddress> {
    return {
      id: input.id,
      recipient_name: input.recipient_name,
      phone: input.phone,
      street_address: input.street_address,
      city: input.city,
      state: input.state,
      postal_code: input.postal_code,
      country: input.country,
      is_default: input.is_default,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    } satisfies IEcommerceMallShippingAddress;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallShippingAddressTransformer {
//       export type Payload = Prisma.ecommerce_mall_shipping_addressesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             recipient_name: true,
//             phone: true,
//             street_address: true,
//             city: true,
//             state: true,
//             postal_code: true,
//             country: true,
//             is_default: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: EcommerceMallCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_shipping_addressesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShippingAddress> {
//         return {
//   id: {string},
//   recipient_name: {string},
//   phone: {string},
//   street_address: {string},
//   city: {string},
//   state: {string},
//   postal_code: {string},
//   country: {string},
//   is_default: {boolean},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {null | string},
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//         };
//       }
//     }
//--------------------------------------------------------------