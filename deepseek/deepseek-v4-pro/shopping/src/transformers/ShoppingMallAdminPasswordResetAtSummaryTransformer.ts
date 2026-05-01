import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdminAtSummaryTransformer } from "./ShoppingMallAdminAtSummaryTransformer";

export namespace ShoppingMallAdminPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_admin_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        ip: true,
        created_at: true,
        expired_at: true,
        admin: ShoppingMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_admin_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminPasswordReset.ISummary> {
    return {
      id: input.id,
      token: input.token,
      ip: input.ip,
      admin: await ShoppingMallAdminAtSummaryTransformer.transform(input.admin),
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallAdminPasswordResetAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_admin_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             ip: true,
//             created_at: true,
//             expired_at: true,
//             admin: ShoppingMallAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_admin_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallAdminPasswordReset.ISummary> {
//         return {
//   id: {string},
//   token: {string},
//   ip: {string},
//   admin: await ShoppingMallAdminAtSummaryTransformer.transform(input.admin),
//   created_at: {string},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------