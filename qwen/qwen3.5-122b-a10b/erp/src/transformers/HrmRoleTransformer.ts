import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmOrganizationAtSummaryTransformer } from "./HrmOrganizationAtSummaryTransformer";
import { HrmPermissionAtSummaryTransformer } from "./HrmPermissionAtSummaryTransformer";

export namespace HrmRoleTransformer {
  export type Payload = Prisma.hrm_rolesGetPayload<ReturnType<typeof select>>;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        is_builtin: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmOrganizationAtSummaryTransformer.select(),
        employeeAssignments: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_employeesFindManyArgs,
        invitations: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_employee_invitationsFindManyArgs,
        employeeSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_employee_snapshotsFindManyArgs,
        rolePermissions: {
          select: {
            hrmPermission: HrmPermissionAtSummaryTransformer.select(),
          },
        } satisfies Prisma.hrm_role_permissionsFindManyArgs,
      },
    } satisfies Prisma.hrm_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmRole> {
    return {
      id: input.id,
      name: input.name,
      is_builtin: input.is_builtin,
      description: input.description ?? null,
      organization: await HrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      permissions: await ArrayUtil.asyncMap(input.rolePermissions, (rp) =>
        HrmPermissionAtSummaryTransformer.transform(rp.hrmPermission),
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IHrmRole;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmRoleTransformer {
//       export type Payload = Prisma.hrm_rolesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             is_builtin: true,
//             description: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.hrm_rolesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmRole> {
//         return {
//   id: {string},
//   name: {string},
//   is_builtin: {boolean},
//   description: {string | null},
//   organization: {IHrmOrganization.ISummary},
//   permissions: {Array<IHrmPermission.ISummary>},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------