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
        display_name: true,
        created_at: true,
        banned_at: true,
      },
    } satisfies Prisma.shopping_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomer.ISummary> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      created_at: input.created_at.toISOString(),
      banned_at: input.banned_at?.toISOString() ?? null,
    } satisfies IShoppingMallCustomer.ISummary;
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
//             display_name: true,
//             phone_number: true,
//             banned_at: true,
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
//   created_at: {string},
//   banned_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------