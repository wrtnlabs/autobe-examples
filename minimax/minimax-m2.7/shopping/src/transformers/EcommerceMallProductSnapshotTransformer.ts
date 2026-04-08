import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductSnapshotImageTransformer } from "./EcommerceMallProductSnapshotImageTransformer";
import { EcommerceMallProductSnapshotVariantTransformer } from "./EcommerceMallProductSnapshotVariantTransformer";
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
        product: EcommerceMallProductAtSummaryTransformer.select(),
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        productSnapshotImages:
          EcommerceMallProductSnapshotImageTransformer.select(),
        productSnapshotVariants:
          EcommerceMallProductSnapshotVariantTransformer.select(),
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
  ): Promise<IEcommerceMallProductSnapshot> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: input.base_price,
      categoryName: input.category_name,
      createdAt: input.created_at.toISOString(),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      images: await ArrayUtil.asyncMap(
        input.productSnapshotImages,
        EcommerceMallProductSnapshotImageTransformer.transform,
      ),
      variants: await ArrayUtil.asyncMap(
        input.productSnapshotVariants,
        EcommerceMallProductSnapshotVariantTransformer.transform,
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
//             product: EcommerceMallProductAtSummaryTransformer.select(),
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//             productSnapshotImages: EcommerceMallProductSnapshotImageTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductSnapshot> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   basePrice: {number},
//   categoryName: {string},
//   createdAt: {string},
//   product: await EcommerceMallProductAtSummaryTransformer.transform(input.product),
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   images: await ArrayUtil.asyncMap(input.productSnapshotImages, EcommerceMallProductSnapshotImageTransformer.transform),
//   variants: {Array<IEcommerceMallProductSnapshotVariant>},
//         };
//       }
//     }
//--------------------------------------------------------------