import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallShippingAddressAtSummaryTransformer {
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
        ecommerce_mall_customer_id: true,
        orders: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_ordersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_shipping_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShippingAddress.ISummary> {
    return {
      city: input.city,
      country: input.country,
      id: input.id,
      is_default: input.is_default,
      recipient_name: input.recipient_name,
      state: input.state,
    } satisfies IEcommerceMallShippingAddress.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallShippingAddressAtSummaryTransformer {
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
//             ecommerce_mall_customer_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_shipping_addressesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShippingAddress.ISummary> {
//         return {
//   city: {string},
//   country: {string},
//   id: {string},
//   is_default: {boolean},
//   recipient_name: {string},
//   state: {string},
//         };
//       }
//     }
//--------------------------------------------------------------