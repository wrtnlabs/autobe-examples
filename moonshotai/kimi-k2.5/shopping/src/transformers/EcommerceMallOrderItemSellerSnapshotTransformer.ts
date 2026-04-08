import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallOrderItemSellerSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_order_item_seller_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        logo_url: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_order_item_seller_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItemSellerSnapshot> {
    return {
      id: input.id,
      shopName: input.shop_name,
      logoUrl: input.logo_url,
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommerceMallOrderItemSellerSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderItemSellerSnapshotTransformer {
//       export type Payload = Prisma.ecommerce_mall_order_item_seller_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             shop_name: true,
//             logo_url: true,
//             created_at: true,
//             order_item_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_order_item_seller_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrderItemSellerSnapshot> {
//         return {
//   id: {string},
//   shopName: {string},
//   logoUrl: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------