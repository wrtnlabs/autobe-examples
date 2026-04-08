import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCustomerProfileAtSummaryTransformer {
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
      },
    } satisfies Prisma.ecommerce_mall_customer_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomerProfile.ISummary> {
    return {
      id: input.id,
      displayName: input.display_name,
      phone: input.phone,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IEcommerceMallCustomerProfile.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCustomerProfileAtSummaryTransformer {
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
//             ecommerce_mall_customer_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_customer_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCustomerProfile.ISummary> {
//         return {
//   id: {string},
//   displayName: {string},
//   phone: {string},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------