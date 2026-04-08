import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformAdministratorTransformer {
  export type Payload = Prisma.mall_platform_administratorsGetPayload<
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
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: { select: {} },
        passwordResets: { select: {} },
        reviewedCancellationRequests: { select: {} },
        refundRequests: { select: {} },
        administratorApprovalRequests: { select: {} },
        reviewedAdministratorApprovalRequests: { select: {} },
      },
    } satisfies Prisma.mall_platform_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformAdministrator> {
    return {
      id: input.id,
      email: input.email,
      grade: input.grade,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformAdministrator;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformAdministratorTransformer {
//       export type Payload = Prisma.mall_platform_administratorsGetPayload<ReturnType<typeof select>>;
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
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.mall_platform_administratorsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformAdministrator> {
//         return {
//   id: {string},
//   email: {string},
//   grade: {string},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------