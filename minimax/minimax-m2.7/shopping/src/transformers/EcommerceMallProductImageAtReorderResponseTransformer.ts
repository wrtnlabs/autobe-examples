import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductImageTransformer } from "./EcommerceMallProductImageTransformer";

export namespace EcommerceMallProductImageAtReorderResponseTransformer {
  export type Payload = Prisma.ecommerce_mall_product_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    const inner = EcommerceMallProductImageTransformer.select();
    return {
      select: "select" in inner ? inner.select : inner,
    } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload[],
  ): Promise<IEcommerceMallProductImage.IReorderResponse> {
    return {
      images: await ArrayUtil.asyncMap(
        input,
        EcommerceMallProductImageTransformer.transform,
      ),
    } satisfies IEcommerceMallProductImage.IReorderResponse;
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
//   images: {Array<IEcommerceMallProductImage>},
//         };
//       }
//     }
//--------------------------------------------------------------