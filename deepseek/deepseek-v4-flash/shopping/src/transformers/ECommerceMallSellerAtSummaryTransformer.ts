import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallSellerProfileAtSummaryTransformer } from "./ECommerceMallSellerProfileAtSummaryTransformer";

export namespace ECommerceMallSellerAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        approval_status: true,
        created_at: true,
        deleted_at: true,
        profile: ECommerceMallSellerProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallSeller.ISummary> {
    if (input.profile === null)
      throw new HttpException("Seller has no profile", 500);
    return {
      id: input.id,
      email: input.email,
      approval_status: input.approval_status,
      profile: await ECommerceMallSellerProfileAtSummaryTransformer.transform(
        input.profile,
      ),
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallSeller.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallSellerAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_sellersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             approval_status: true,
//             created_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.e_commerce_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallSeller.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   approval_status: {string},
//   profile: {IECommerceMallSellerProfile.ISummary},
//   created_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------