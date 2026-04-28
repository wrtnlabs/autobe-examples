import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommercePlatformSellerTransformer {
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
        updated_at: true,
        deleted_at: true,
        sellerProfile: {
          select: {
            shop_name: true,
            shop_description: true,
            logo_image_uri: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_platform_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSeller> {
    return {
      id: input.id,
      email: input.email,
      approval_status: input.approval_status,
      rejection_reason: input.rejection_reason ?? null,
      is_banned: input.is_banned,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? undefined,
      shop_name: input.sellerProfile?.shop_name ?? null,
      shop_description: input.sellerProfile?.shop_description ?? null,
      logo_image_uri: input.sellerProfile?.logo_image_uri ?? null,
      profile_created_at:
        input.sellerProfile?.created_at?.toISOString() ?? null,
      profile_updated_at:
        input.sellerProfile?.updated_at?.toISOString() ?? null,
      profile_deleted_at:
        input.sellerProfile?.deleted_at?.toISOString() ?? undefined,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSellerTransformer {
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
//           },
//         } satisfies Prisma.ecommerce_platform_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSeller> {
//         return {
//   id: {string},
//   email: {string},
//   approval_status: {string},
//   rejection_reason: {string | null},
//   is_banned: {boolean},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   shop_name: {string | null},
//   shop_description: {string | null},
//   logo_image_uri: {string | null},
//   profile_created_at: {string | null},
//   profile_updated_at: {string | null},
//   profile_deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------