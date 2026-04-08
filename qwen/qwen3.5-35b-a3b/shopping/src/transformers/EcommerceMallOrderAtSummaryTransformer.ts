import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAddressAtSummaryTransformer } from "./EcommerceMallCustomerAddressAtSummaryTransformer";
import { EcommerceMallMemberAtSummaryTransformer } from "./EcommerceMallMemberAtSummaryTransformer";

export namespace EcommerceMallOrderAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        status: true,
        total_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: EcommerceMallMemberAtSummaryTransformer.select(),
        shippingAddress:
          EcommerceMallCustomerAddressAtSummaryTransformer.select(),
        items: true,
      },
    } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrder.ISummary> {
    return {
      id: input.id,
      order_number: input.order_number,
      status: input.status,
      total_price: Number(input.total_price),
      created_at: input.created_at.toISOString(),
      items_count: input.items.length,
      customer: await EcommerceMallMemberAtSummaryTransformer.transform(
        input.member,
      ),
      shipping_address:
        await EcommerceMallCustomerAddressAtSummaryTransformer.transform(
          input.shippingAddress,
        ),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallOrder.ISummary;
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
//             order_number: true,
//             status: true,
//             total_price: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: EcommerceMallMemberAtSummaryTransformer.select(),
//             shippingAddress: EcommerceMallCustomerAddressAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrder.ISummary> {
//         return {
//   id: {string},
//   order_number: {string},
//   status: {string},
//   total_price: {number},
//   created_at: {string},
//   items_count: {integer},
//   customer: await EcommerceMallMemberAtSummaryTransformer.transform(input.member),
//   shipping_address: await EcommerceMallCustomerAddressAtSummaryTransformer.transform(input.shippingAddress),
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------