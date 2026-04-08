import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSuperAdminAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_super_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        auditLogs: true,
        reviewedAdminRequests: true,
        reviewedSellerAdminRequests: true,
        adminPromotions: true,
      },
    } satisfies Prisma.ecommerce_mall_super_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSuperAdmin.ISummary> {
    return {
      id: input.id,
      email: input.email,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      isDeleted: input.deleted_at !== null,
    } satisfies IEcommerceMallSuperAdmin.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSuperAdminAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_super_adminsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.ecommerce_mall_super_adminsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSuperAdmin.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   isDeleted: {boolean},
//         };
//       }
//     }
//--------------------------------------------------------------