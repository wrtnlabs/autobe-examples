import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCustomerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: {
          select: {
            id: true,
            ecommerce_mall_customer_id: true,
            display_name: true,
            phone: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomer.ISummary> {
    return {
      id: input.id,
      email: input.email,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      customerProfile: {
        id: input.profile!.id,
        profileType: "customer" as const,
        customerId: input.profile!.ecommerce_mall_customer_id,
        displayName: input.profile!.display_name,
        phone: input.profile!.phone,
        createdAt: toISOStringSafe(input.profile!.created_at),
        updatedAt: toISOStringSafe(input.profile!.updated_at),
      } satisfies IEcommerceMallCustomerProfile,
    } satisfies IEcommerceMallCustomer.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCustomerAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_customersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             createdAt: true,
//             updatedAt: true,
//             deletedAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCustomer.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   customerProfile: {IEcommerceMallCustomerProfile},
//         };
//       }
//     }
//--------------------------------------------------------------