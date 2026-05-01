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

export namespace ShoppingMallAdminSessionAtSummaryTransformer {
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
  ): Promise<IShoppingMallAdminSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      admin: await ShoppingMallAdminAtSummaryTransformer.transform(input.admin),
    } satisfies IShoppingMallAdminSession.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallAdminSessionAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IShoppingMallAdminSession.ISummary> {
//         return {
//   id: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   created_at: {string},
//   expired_at: {string},
//   admin: await ShoppingMallAdminAtSummaryTransformer.transform(input.admin),
//         };
//       }
//     }
//--------------------------------------------------------------