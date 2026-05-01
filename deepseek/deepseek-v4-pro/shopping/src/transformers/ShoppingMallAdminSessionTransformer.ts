import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdminAtSummaryTransformer } from "./ShoppingMallAdminAtSummaryTransformer";

export namespace ShoppingMallAdminSessionTransformer {
  export type Payload = Prisma.shopping_mall_admin_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        admin: ShoppingMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_admin_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminSession> {
    return {
      id: input.id,
      admin: await ShoppingMallAdminAtSummaryTransformer.transform(input.admin),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    } satisfies IShoppingMallAdminSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallAdminSessionTransformer {
//       export type Payload = Prisma.shopping_mall_admin_sessionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             ip: true,
//             href: true,
//             referrer: true,
//             created_at: true,
//             expired_at: true,
//             admin: ShoppingMallAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_admin_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallAdminSession> {
//         return {
//   id: {string},
//   admin: await ShoppingMallAdminAtSummaryTransformer.transform(input.admin),
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   created_at: {string},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------