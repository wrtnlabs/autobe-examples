import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformCustomerAtSummaryTransformer } from "./EcommercePlatformCustomerAtSummaryTransformer";

export namespace EcommercePlatformCustomerProfileAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_customer_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        phone_number: true,
        created_at: true,
        customer: EcommercePlatformCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_customer_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformCustomerProfile.ISummary> {
    return {
      id: input.id,
      display_name: input.display_name,
      phone_number: input.phone_number ?? null,
      customer: await EcommercePlatformCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IEcommercePlatformCustomerProfile.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformCustomerProfileAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_customer_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             display_name: true,
//             phone_number: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: EcommercePlatformCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_customer_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformCustomerProfile.ISummary> {
//         return {
//   id: {string},
//   display_name: {string},
//   phone_number: {string | null},
//   customer: await EcommercePlatformCustomerAtSummaryTransformer.transform(input.customer),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------