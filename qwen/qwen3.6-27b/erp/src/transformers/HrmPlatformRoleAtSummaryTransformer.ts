import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformRoleAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.hrm_platform_rolesGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        built_in: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.hrm_platform_rolesFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformRole.ISummary> {
    return {
      id: input.id,
      name: input.name,
      builtIn: input.built_in,
      description: input.description ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IHrmPlatformRole.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformRoleAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_rolesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             built_in: true,
//             description: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             hrm_platform_organization_id: true,
//           },
//         } satisfies Prisma.hrm_platform_rolesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformRole.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   builtIn: {boolean},
//   description: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------