import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformSellerAtSummaryTransformer } from "./MallPlatformSellerAtSummaryTransformer";

export namespace MallPlatformSellerPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_seller_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reset_token: true,
        expired_at: true,
        consumed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sellerAccount: MallPlatformSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_seller_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformSellerPasswordReset.ISummary> {
    return {
      id: input.id,
      sellerAccount: await MallPlatformSellerAtSummaryTransformer.transform(
        input.sellerAccount,
      ),
      expiredAt: input.expired_at.toISOString(),
      consumedAt: input.consumed_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformSellerPasswordReset.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformSellerPasswordResetAtSummaryTransformer {
//       export type Payload = Prisma.mall_platform_seller_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reset_token: true,
//             expired_at: true,
//             consumed_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller_account_id: true,
//             ...
//           },
//         } satisfies Prisma.mall_platform_seller_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformSellerPasswordReset.ISummary> {
//         return {
//   id: {string},
//   sellerAccount: {IMallPlatformSeller.ISummary},
//   expiredAt: {string | null},
//   consumedAt: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------