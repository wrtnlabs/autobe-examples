import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallProductSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        category_name: true,
        created_at: true,
        product: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        productSnapshotImages: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_product_snapshot_imagesFindManyArgs,
        productSnapshotVariants: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_product_snapshot_variantsFindManyArgs,
        orderItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: Number(input.base_price),
      categoryName: input.category_name,
      createdAt: input.created_at.toISOString(),
      productId: input.product.id,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    } satisfies IEcommerceMallProductSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             base_price: true,
//             category_name: true,
//             created_at: true,
//             ecommerce_mall_product_id: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductSnapshot.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   basePrice: {number},
//   categoryName: {string},
//   createdAt: {string},
//   productId: {string},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//         };
//       }
//     }
//--------------------------------------------------------------