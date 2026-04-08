import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallCustomerSessionAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_customer_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
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
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
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
//             access_token: true,
//             refresh_token: true,
//             ip: true,
//             href: true,
//             referrer: true,
//             created_at: true,
//             updated_at: true,
//             expired_at: true,
//             customer: EcommerceMallCustomerAtSummaryTransformer.select(),
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
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   created_at: {string},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------