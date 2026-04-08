import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCustomerProfileTransformer {
  export type Payload = Prisma.shopping_mall_customer_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: { select: { id: true } },
      },
    } satisfies Prisma.shopping_mall_customer_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomerProfile> {
    return {
      id: input.id,
      display_name: input.display_name,
      phone_number: input.phone_number,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCustomerProfileTransformer {
//       export type Payload = Prisma.shopping_mall_customer_profilesGetPayload<ReturnType<typeof select>>;
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
//             shopping_mall_customer_id: true,
//           },
//         } satisfies Prisma.shopping_mall_customer_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCustomerProfile> {
//         return {
//   id: {string},
//   display_name: {string},
//   phone_number: {string | null},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------