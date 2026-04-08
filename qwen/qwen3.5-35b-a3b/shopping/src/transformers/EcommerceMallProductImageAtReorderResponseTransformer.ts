import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductImageAtSummaryTransformer } from "./EcommerceMallProductImageAtSummaryTransformer";

export namespace EcommerceMallProductImageAtReorderResponseTransformer {
  export type Payload = Prisma.ecommerce_mall_product_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: EcommerceMallProductImageAtSummaryTransformer.select().select,
    } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload[],
  ): Promise<IEcommerceMallProductImage.IReorderResponse> {
    return {
      images: await ArrayUtil.asyncMap(
        input,
        EcommerceMallProductImageAtSummaryTransformer.transform,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductImageAtReorderResponseTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductImage.IReorderResponse> {
//         return {
//   images: {Array<IEcommerceMallProductImage.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------