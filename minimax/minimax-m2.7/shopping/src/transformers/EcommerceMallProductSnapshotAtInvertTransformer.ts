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

export namespace EcommerceMallProductSnapshotAtInvertTransformer {
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
        seller: true,
        productSnapshotImages:
          EcommerceMallProductSnapshotImageTransformer.select(),
        productSnapshotVariants:
          EcommerceMallProductSnapshotVariantTransformer.select(),
        orderItems: true,
      },
    } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshot.IInvert> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: Number(input.base_price),
      categoryName: input.category_name,
      createdAt: input.created_at.toISOString(),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      productSnapshotImages: await ArrayUtil.asyncMap(
        input.productSnapshotImages,
        EcommerceMallProductSnapshotImageTransformer.transform,
      ),
      productSnapshotVariants: await ArrayUtil.asyncMap(
        input.productSnapshotVariants,
        EcommerceMallProductSnapshotVariantTransformer.transform,
      ),
    } satisfies IEcommerceMallProductSnapshot.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductSnapshotAtInvertTransformer {
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
//             ecommerce_mall_seller_id: true,
//             productSnapshotImages: EcommerceMallProductSnapshotImageTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductSnapshot.IInvert> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   basePrice: {number},
//   categoryName: {string},
//   createdAt: {string},
//   product: await EcommerceMallProductAtSummaryTransformer.transform(input.product),
//   productSnapshotImages: await ArrayUtil.asyncMap(input.productSnapshotImages, EcommerceMallProductSnapshotImageTransformer.transform),
//   productSnapshotVariants: {Array<IEcommerceMallProductSnapshotVariant>},
//         };
//       }
//     }
//--------------------------------------------------------------