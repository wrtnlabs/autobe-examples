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
        grade: true,
        status: true,
        nickname: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.ecommerce_mall_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdmin> {
    return {
      id: input.id,
      email: input.email,
      grade: input.grade,
      status: input.status,
      nickname: input.nickname,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
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
//       export async function transform(input: Payload): Promise<IEcommerceMallAdmin> {
//         return {
//   id: {string},
//   email: {string},
//   grade: {string},
//   status: {string},
//   nickname: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------