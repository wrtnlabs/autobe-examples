import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

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
        customer: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
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
  ): Promise<IEcommerceMallShippingAddress> {
    return {
      id: input.id,
      recipientName: input.recipient_name,
      phone: input.phone,
      streetAddress: input.street_address,
      city: input.city,
      state: input.state,
      postalCode: input.postal_code,
      country: input.country,
      isDefault: input.is_default,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
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
//             ecommerce_mall_customer_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_shipping_addressesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShippingAddress> {
//         return {
//   id: {string},
//   recipientName: {string},
//   phone: {string},
//   streetAddress: {string},
//   city: {string},
//   state: {string},
//   postalCode: {string},
//   country: {string},
//   isDefault: {boolean},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------