import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";
import { HrmPlatformPermissionAtSummaryTransformer } from "./HrmPlatformPermissionAtSummaryTransformer";

export namespace HrmPlatformRoleTransformer {
  export type Payload = Prisma.hrm_platform_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        role_kind: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        employees: true,
        employeeSnapshots: true,
        permissions: HrmPlatformPermissionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmPlatformRole> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? "",
      role_kind: input.role_kind,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      permissions: await ArrayUtil.asyncMap(
        input.permissions,
        HrmPlatformPermissionAtSummaryTransformer.transform,
      ),
    } satisfies IHrmPlatformRole;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformRoleTransformer {
//       export type Payload = Prisma.hrm_platform_rolesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             role_kind: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
//             permissions: HrmPlatformPermissionAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_rolesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformRole> {
//         return {
//   created_at: {string},
//   deleted_at: {string | null},
//   description: {string},
//   id: {string},
//   name: {string},
//   organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(input.organization),
//   permissions: await ArrayUtil.asyncMap(input.permissions, HrmPlatformPermissionAtSummaryTransformer.transform),
//   role_kind: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------