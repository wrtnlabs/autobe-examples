import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerProfileTransformer } from "./ShoppingMallCustomerProfileTransformer";

export namespace ShoppingMallCustomerTransformer {
  export type Payload = Prisma.shopping_mall_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: ShoppingMallCustomerProfileTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomer> {
    if (input.profile === null)
      throw new HttpException("Profile is required", 400);
    return {
      id: input.id,
      email: input.email,
      banned: input.banned,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      profile: await ShoppingMallCustomerProfileTransformer.transform(
        input.profile,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCustomerTransformer {
//       export type Payload = Prisma.shopping_mall_customersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             banned: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.shopping_mall_customersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCustomer> {
//         return {
//   id: {string},
//   email: {string},
//   banned: {boolean},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   profile: {IShoppingMallCustomerProfile},
//         };
//       }
//     }
//--------------------------------------------------------------