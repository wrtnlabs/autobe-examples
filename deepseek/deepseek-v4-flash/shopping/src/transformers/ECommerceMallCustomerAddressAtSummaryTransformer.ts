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

export namespace ECommerceMallCustomerAddressAtSummaryTransformer {
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
  ): Promise<IECommerceMallCustomerAddress.ISummary> {
    return {
      id: input.id,
      recipientName: input.recipient_name,
      phoneNumber: input.phone_number,
      streetAddress: input.street_address,
      city: input.city,
      stateProvince: input.state_province,
      postalCode: input.postal_code,
      country: input.country,
      isDefault: input.is_default,
      createdAt: input.created_at.toISOString(),
      customer: await ECommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    } satisfies IECommerceMallCustomerAddress.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallCustomerAddressAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IECommerceMallCustomerAddress.ISummary> {
//         return {
//   id: {string},
//   recipientName: {string},
//   phoneNumber: {string},
//   streetAddress: {string},
//   city: {string},
//   stateProvince: {string},
//   postalCode: {string},
//   country: {string},
//   isDefault: {boolean},
//   createdAt: {string},
//   customer: await ECommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//         };
//       }
//     }
//--------------------------------------------------------------