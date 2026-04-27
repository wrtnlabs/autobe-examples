import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallCustomerAtSummaryTransformer } from "./ECommerceMallCustomerAtSummaryTransformer";

export namespace ECommerceMallCustomerAddressTransformer {
  export type Payload = Prisma.e_commerce_mall_customer_addressesGetPayload<
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
        state_province: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: ECommerceMallCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_customer_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallCustomerAddress> {
    return {
      id: input.id,
      customer: await ECommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      recipient_name: input.recipient_name,
      phone_number: input.phone_number,
      street_address: input.street_address,
      city: input.city,
      state_province: input.state_province,
      postal_code: input.postal_code,
      country: input.country,
      is_default: input.is_default,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IECommerceMallCustomerAddress;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallCustomerAddressTransformer {
//       export type Payload = Prisma.e_commerce_mall_customer_addressesGetPayload<ReturnType<typeof select>>;
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
//             customer: ECommerceMallCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_customer_addressesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallCustomerAddress> {
//         return {
//   id: {string},
//   customer: await ECommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   recipient_name: {string},
//   phone_number: {string},
//   street_address: {string},
//   city: {string},
//   state_province: {string},
//   postal_code: {string},
//   country: {string},
//   is_default: {boolean},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------