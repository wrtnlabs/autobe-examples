import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ECommerceMallSellerProfileAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_seller_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        logo_image: true,
      },
    } satisfies Prisma.e_commerce_mall_seller_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallSellerProfile.ISummary> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      logo_image: input.logo_image ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallSellerProfileAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_seller_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             shop_name: true,
//             shop_description: true,
//             logo_image: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             e_commerce_mall_seller_id: true,
//           },
//         } satisfies Prisma.e_commerce_mall_seller_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallSellerProfile.ISummary> {
//         return {
//   id: {string},
//   shop_name: {string},
//   logo_image: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------