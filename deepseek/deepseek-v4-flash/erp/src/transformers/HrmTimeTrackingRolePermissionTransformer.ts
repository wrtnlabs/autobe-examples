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
import { HrmTimeTrackingRoleAtSummaryTransformer } from "./HrmTimeTrackingRoleAtSummaryTransformer";

export namespace HrmTimeTrackingRolePermissionTransformer {
  export type Payload = Prisma.hrm_time_tracking_role_permissionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        permission_code: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_role_permissionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingRolePermission> {
    return {
      id: input.id,
      permission_code: input.permission_code,
      role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmTimeTrackingRolePermission;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingRolePermissionTransformer {
//       export type Payload = Prisma.hrm_time_tracking_role_permissionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             permission_code: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_role_permissionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingRolePermission> {
//         return {
//   id: {string},
//   permission_code: {string},
//   role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------