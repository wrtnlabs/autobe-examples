import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAdminTransformer {
  export type Payload = Prisma.ecommerce_mall_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_sessionsFindManyArgs,
        passwordResets: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_password_resetsFindManyArgs,
        auditLogs: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_audit_logsFindManyArgs,
        reviewedSellerApprovals: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_approvalsFindManyArgs,
        sellerSuspensionsInitiateds: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_suspensionsFindManyArgs,
        sellerSuspensionsRestoreds: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_suspensionsFindManyArgs,
        promotions: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_promotionsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdmin> {
    return {
      id: input.id,
      email: input.email,
      name: input.name,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallAdmin;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdminTransformer {
//       export type Payload = Prisma.ecommerce_mall_adminsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             name: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.ecommerce_mall_adminsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdmin> {
//         return {
//   id: {string},
//   email: {string},
//   name: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------