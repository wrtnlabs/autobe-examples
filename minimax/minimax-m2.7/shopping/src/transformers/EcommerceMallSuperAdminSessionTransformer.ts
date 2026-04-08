import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "./EcommerceMallSuperAdminAtSummaryTransformer";

export namespace EcommerceMallSuperAdminSessionTransformer {
  export type Payload = Prisma.ecommerce_mall_super_admin_sessionsGetPayload<
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
        superAdmin: EcommerceMallSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_super_admin_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSuperAdminSession> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      superAdmin: await EcommerceMallSuperAdminAtSummaryTransformer.transform(
        input.superAdmin,
      ),
    } satisfies IEcommerceMallSuperAdminSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSuperAdminSessionTransformer {
//       export type Payload = Prisma.ecommerce_mall_super_admin_sessionsGetPayload<ReturnType<typeof select>>;
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
//             superAdmin: EcommerceMallSuperAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_super_admin_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSuperAdminSession> {
//         return {
//   id: {string},
//   createdAt: {string},
//   expiredAt: {string},
//   href: {string},
//   ip: {string},
//   referrer: {string},
//   superAdmin: await EcommerceMallSuperAdminAtSummaryTransformer.transform(input.superAdmin),
//         };
//       }
//     }
//--------------------------------------------------------------