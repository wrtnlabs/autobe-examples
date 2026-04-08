import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformCustomerAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_customersGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformCustomer.ISummary> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: false as never,
        passwordResets: false as never,
        profile: false as never,
        shippingAddresses: false as never,
        shoppingCart: false as never,
        wishlist: false as never,
        orders: false as never,
        refundRequests: false as never,
        reviews: false as never,
        reviewSnapshots: false as never,
      },
    } satisfies Prisma.mall_platform_customersFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformCustomerAtSummaryTransformer {
//       export type Payload = Prisma.mall_platform_customersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.mall_platform_customersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformCustomer.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------