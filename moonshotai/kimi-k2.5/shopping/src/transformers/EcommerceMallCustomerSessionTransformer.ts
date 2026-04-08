import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCustomerSessionTransformer {
  export type Payload = Prisma.ecommerce_mall_customer_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        customer: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_customer_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomerSession> {
    return {
      id: input.id,
      customerId: input.ecommerce_mall_customer_id,
      customer: {
        id: input.customer.id,
      } satisfies IEcommerceMallCustomer.ISummary,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
    } satisfies IEcommerceMallCustomerSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCustomerSessionTransformer {
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
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_customer_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCustomerSession> {
//         return {
//   id: {string},
//   customerId: {string},
//   customer: {IEcommerceMallCustomer.ISummary},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   createdAt: {string},
//   expiredAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------