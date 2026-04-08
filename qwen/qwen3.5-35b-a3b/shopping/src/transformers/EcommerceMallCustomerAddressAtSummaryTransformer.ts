import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCustomerAddressAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_customer_addressesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        recipient_name: true,
        phone: true,
        street: true,
        city: true,
        state: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: true,
        orders: true,
      },
    } satisfies Prisma.ecommerce_mall_customer_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomerAddress.ISummary> {
    return {
      id: input.id,
      recipient_name: input.recipient_name,
      phone: input.phone,
      street: input.street,
      city: input.city,
      state: input.state,
      postal_code: input.postal_code,
      country: input.country,
      is_default: input.is_default,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceMallCustomerAddress.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCustomerAddressAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_customer_addressesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             recipient_name: true,
//             phone: true,
//             street: true,
//             city: true,
//             state: true,
//             postal_code: true,
//             country: true,
//             is_default: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ecommerce_mall_member_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_customer_addressesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCustomerAddress.ISummary> {
//         return {
//   id: {string},
//   recipient_name: {string},
//   phone: {string},
//   street: {string},
//   city: {string},
//   state: {string},
//   postal_code: {string},
//   country: {string},
//   is_default: {boolean},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------