import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCustomerAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: {
          select: {
            display_name: true,
          },
        } satisfies Prisma.shopping_mall_customer_profilesFindManyArgs,
        sessions: true,
        passwordResets: true,
        addresses: true,
        wishlistEntries: true,
        cart: true,
        orders: true,
        requestSnapshots: true,
        reviews: true,
        reviewSnapshots: true,
        cancellationRequests: true,
        refundRequests: true,
        administratorRequests: true,
        promotionRequest: true,
      },
    } satisfies Prisma.shopping_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomer.ISummary> {
    if (!input.profile) {
      throw new HttpException("Customer profile not found", 404);
    }
    return {
      id: input.id,
      email: input.email,
      display_name: input.profile.display_name,
      banned: input.banned,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCustomerAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_customersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             banned: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.shopping_mall_customersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCustomer.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   display_name: {string},
//   banned: {boolean},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------