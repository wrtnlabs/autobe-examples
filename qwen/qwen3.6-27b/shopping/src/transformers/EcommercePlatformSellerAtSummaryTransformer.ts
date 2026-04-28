import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformSellerProfileAtSummaryTransformer } from "./EcommercePlatformSellerProfileAtSummaryTransformer";

export namespace EcommercePlatformSellerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        approval_status: true,
        rejection_reason: true,
        is_banned: true,
        created_at: true,
        sellerProfile:
          EcommercePlatformSellerProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSeller.ISummary> {
    if (input.sellerProfile === null)
      throw new HttpException("Seller profile not found", 404);
    return {
      id: input.id,
      email: input.email,
      approvalStatus: input.approval_status,
      rejectionReason: input.rejection_reason ?? null,
      isBanned: input.is_banned,
      createdAt: input.created_at.toISOString(),
      sellerProfile:
        await EcommercePlatformSellerProfileAtSummaryTransformer.transform(
          input.sellerProfile,
        ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSellerAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_sellersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             approval_status: true,
//             rejection_reason: true,
//             is_banned: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             sellerProfile: EcommercePlatformSellerProfileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSeller.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   approvalStatus: {string},
//   rejectionReason: {string | null},
//   isBanned: {boolean},
//   createdAt: {string},
//   sellerProfile: await EcommercePlatformSellerProfileAtSummaryTransformer.transform(input.sellerProfile),
//         };
//       }
//     }
//--------------------------------------------------------------