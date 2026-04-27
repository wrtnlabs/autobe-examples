import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";
import { HrmTimeTrackingRolePermissionTransformer } from "./HrmTimeTrackingRolePermissionTransformer";

export namespace HrmTimeTrackingRoleTransformer {
  export type Payload = Prisma.hrm_time_tracking_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        rolePermissions: HrmTimeTrackingRolePermissionTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingRole> {
    return {
      id: input.id,
      name: input.name,
      type: input.type,
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      rolePermissions: await ArrayUtil.asyncMap(
        input.rolePermissions,
        HrmTimeTrackingRolePermissionTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingRoleTransformer {
//       export type Payload = Prisma.hrm_time_tracking_rolesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             type: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
//             rolePermissions: HrmTimeTrackingRolePermissionTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_rolesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingRole> {
//         return {
//   id: {string},
//   name: {string},
//   type: {string},
//   organization: await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(input.organization),
//   rolePermissions: await ArrayUtil.asyncMap(input.rolePermissions, HrmTimeTrackingRolePermissionTransformer.transform),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------