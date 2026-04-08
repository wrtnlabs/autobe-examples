import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCustomerSessionAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_customer_sessionsGetPayload<
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
      },
    } satisfies Prisma.ecommerce_mall_customer_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomerSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      isActive: new Date(input.expired_at).getTime() > Date.now(),
    } satisfies IEcommerceMallCustomerSession.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCustomerSessionAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_customer_sessionsGetPayload<ReturnType<typeof select>>;
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
//             ecommerce_mall_customer_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_customer_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCustomerSession.ISummary> {
//         return {
//   id: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   createdAt: {string},
//   expiredAt: {string | null},
//   isActive: {boolean},
//         };
//       }
//     }
//--------------------------------------------------------------