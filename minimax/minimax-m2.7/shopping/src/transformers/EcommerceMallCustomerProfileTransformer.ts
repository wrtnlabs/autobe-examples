import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallCustomerProfileTransformer {
  export type Payload = Prisma.ecommerce_mall_customer_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        phone: true,
        created_at: true,
        updated_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_customer_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomerProfile> {
    return {
      id: input.id,
      display_name: input.display_name,
      phone: input.phone,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCustomerProfileTransformer {
//       export type Payload = Prisma.ecommerce_mall_customer_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             display_name: true,
//             phone: true,
//             created_at: true,
//             updated_at: true,
//             customer: EcommerceMallCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_customer_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCustomerProfile> {
//         return {
//   id: {string},
//   display_name: {string},
//   phone: {string},
//   created_at: {string},
//   updated_at: {string},
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//         };
//       }
//     }
//--------------------------------------------------------------