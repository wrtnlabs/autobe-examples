import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAdminAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        grade: true,
        status: true,
        nickname: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdmin.ISummary> {
    return {
      id: input.id,
      email: input.email,
      grade: input.grade as "regular" | "super_admin",
      status: input.status as "active" | "suspended" | "banned",
      nickname: input.nickname ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdminAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_adminsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             grade: true,
//             status: true,
//             nickname: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.ecommerce_mall_adminsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdmin.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   grade: {"regular" | "super_admin"},
//   status: {"active" | "suspended" | "banned"},
//   nickname: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------