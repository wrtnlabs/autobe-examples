import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";

export namespace ShoppingMallOrderAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        total_price: true,
        status: true,
        created_at: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrder.ISummary> {
    return {
      id: input.id,
      code: input.code,
      total_price: input.total_price,
      status: input.status,
      created_at: input.created_at.toISOString(),
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    } satisfies IShoppingMallOrder.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallOrderAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_ordersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             code: true,
//             recipient_name: true,
//             phone_number: true,
//             street_address: true,
//             city: true,
//             state_province: true,
//             postal_code: true,
//             country: true,
//             total_price: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: ShoppingMallCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrder.ISummary> {
//         return {
//   id: {string},
//   code: {string},
//   total_price: {number},
//   status: {string},
//   created_at: {string},
//   customer: await ShoppingMallCustomerAtSummaryTransformer.transform(input.customer),
//         };
//       }
//     }
//--------------------------------------------------------------