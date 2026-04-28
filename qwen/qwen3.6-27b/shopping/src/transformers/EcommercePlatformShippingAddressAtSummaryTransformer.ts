import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommercePlatformShippingAddressAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_shipping_addressesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        recipient_name: true,
        phone_number: true,
        street_address: true,
        city: true,
        state: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_platform_shipping_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformShippingAddress.ISummary> {
    return {
      id: input.id,
      recipient_name: input.recipient_name,
      phone_number: input.phone_number,
      street_address: input.street_address,
      city: input.city,
      state: input.state,
      postal_code: input.postal_code,
      country: input.country,
      is_default: input.is_default,
      created_at: input.created_at.toISOString(),
    } satisfies IEcommercePlatformShippingAddress.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformShippingAddressAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_shipping_addressesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             recipient_name: true,
//             phone_number: true,
//             street_address: true,
//             city: true,
//             state: true,
//             postal_code: true,
//             country: true,
//             is_default: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ecommerce_platform_customer_profile_id: true,
//           },
//         } satisfies Prisma.ecommerce_platform_shipping_addressesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformShippingAddress.ISummary> {
//         return {
//   id: {string},
//   recipient_name: {string},
//   phone_number: {string},
//   street_address: {string},
//   city: {string},
//   state: {string},
//   postal_code: {string},
//   country: {string},
//   is_default: {boolean},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------