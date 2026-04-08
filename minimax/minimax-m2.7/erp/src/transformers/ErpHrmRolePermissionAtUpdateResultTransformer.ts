import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmRoleAtSummaryTransformer } from "./ErpHrmRoleAtSummaryTransformer";

export namespace ErpHrmRolePermissionAtUpdateResultTransformer {
  export type Payload = Prisma.erp_hrm_role_permissionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        permission: true,
        created_at: true,
        updated_at: true,
        role: ErpHrmRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_role_permissionsFindManyArgs;
  }
  // Local type for explicit typing to avoid Prisma inference issues
  type RowType = {
    id: string;
    permission: string;
    created_at: Date;
    updated_at: Date;
    role: Awaited<
      ReturnType<typeof ErpHrmRoleAtSummaryTransformer.transform>
    > extends {
      role: infer R;
    }
      ? R
      : never;
  };
  export async function transform(
    input: RowType[],
  ): Promise<IErpHrmRolePermission.IUpdateResult> {
    return {
      permissions: input.map((row: RowType) => row.permission),
      role: await ErpHrmRoleAtSummaryTransformer.transform({
        role: input[0]?.role,
      } as any),
    } satisfies IErpHrmRolePermission.IUpdateResult;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmRolePermissionAtUpdateResultTransformer {
//       export type Payload = Prisma.erp_hrm_role_permissionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             ...
//           },
//         } satisfies Prisma.erp_hrm_role_permissionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmRolePermission.IUpdateResult> {
//         return {
//   permissions: {Array<string>},
//   role: {IErpHrmRole.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------