import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallOrderAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        total_price: true,
        status: true,
        created_at: true,
        customer: {
          select: {
            id: true,
          } satisfies Prisma.ecommerce_mall_customersSelect,
        },
      },
    } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrder.ISummary> {
    return {
      id: input.id,
      orderNumber: input.order_number,
      totalPrice: input.total_price,
      status: input.status,
      createdAt: toISOStringSafe(input.created_at) satisfies string &
        tags.Format<"date-time"> as string,
      customer: {
        id: input.customer.id,
      } satisfies IEcommerceMallCustomer.ISummary &
        Record<string, unknown> as IEcommerceMallCustomer.ISummary,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_ordersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             orderNumber: true,
//             totalPrice: true,
//             status: true,
//             createdAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrder.ISummary> {
//         return {
//   id: {string},
//   orderNumber: {string},
//   totalPrice: {number},
//   status: {string},
//   createdAt: {string},
//   customer: {IEcommerceMallCustomer.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------