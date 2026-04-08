import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCustomerAtSummaryTransformer } from "./MallPlatformCustomerAtSummaryTransformer";

export namespace MallPlatformShippingAddressTransformer {
  export type Payload = Prisma.mall_platform_shipping_addressesGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformShippingAddress> {
    return {
      id: input.id,
      customer: await MallPlatformCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      recipientName: input.recipient_name,
      phoneNumber: input.phone_number,
      streetAddress: input.street_address,
      city: input.city,
      stateProvince: input.state_province,
      postalCode: input.postal_code,
      country: input.country,
      isDefault: input.is_default,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformShippingAddress;
  }
  export function select() {
    return {
      select: {
        id: true,
        recipient_name: true,
        phone_number: true,
        street_address: true,
        city: true,
        state_province: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: MallPlatformCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_shipping_addressesFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformShippingAddressTransformer {
//       export type Payload = Prisma.mall_platform_shipping_addressesGetPayload<ReturnType<typeof select>>;
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
//             state_province: true,
//             postal_code: true,
//             country: true,
//             is_default: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: MallPlatformCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_shipping_addressesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformShippingAddress> {
//         return {
//   id: {string},
//   customer: await MallPlatformCustomerAtSummaryTransformer.transform(input.customer),
//   recipientName: {string},
//   phoneNumber: {string},
//   streetAddress: {string},
//   city: {string},
//   stateProvince: {string},
//   postalCode: {string},
//   country: {string},
//   isDefault: {boolean},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------