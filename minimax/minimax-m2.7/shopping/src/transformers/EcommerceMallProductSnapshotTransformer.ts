import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductSnapshotAtProductSnapshotImageTransformer } from "./EcommerceMallProductSnapshotAtProductSnapshotImageTransformer";
import { EcommerceMallProductSnapshotAtProductSnapshotVariantTransformer } from "./EcommerceMallProductSnapshotAtProductSnapshotVariantTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallProductSnapshotTransformer {
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
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        productSnapshotVariants:
          EcommerceMallProductSnapshotAtProductSnapshotVariantTransformer.select(),
        productSnapshotImages:
          EcommerceMallProductSnapshotAtProductSnapshotImageTransformer.select(),
        orderItems: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshot> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      category_name: input.category_name,
      created_at: input.created_at.toISOString(),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      variants: await ArrayUtil.asyncMap(
        input.productSnapshotVariants,
        EcommerceMallProductSnapshotAtProductSnapshotVariantTransformer.transform,
      ),
      images: await ArrayUtil.asyncMap(
        input.productSnapshotImages,
        EcommerceMallProductSnapshotAtProductSnapshotImageTransformer.transform,
      ),
    } satisfies IEcommerceMallProductSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductSnapshotTransformer {
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
//             productSnapshotVariants: EcommerceMallProductSnapshotAtProductSnapshotVariantTransformer.select(),
//             productSnapshotImages: EcommerceMallProductSnapshotAtProductSnapshotImageTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductSnapshot> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   base_price: {number},
//   category_name: {string},
//   created_at: {string},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   variants: await ArrayUtil.asyncMap(input.productSnapshotVariants, EcommerceMallProductSnapshotAtProductSnapshotVariantTransformer.transform),
//   images: await ArrayUtil.asyncMap(input.productSnapshotImages, EcommerceMallProductSnapshotAtProductSnapshotImageTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------