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
import { ErpHrmRolePermissionTransformer } from "./ErpHrmRolePermissionTransformer";

export namespace ErpHrmRolePermissionAtListTransformer {
  export type Payload = Prisma.erp_hrm_role_permissionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      ...ErpHrmRolePermissionTransformer.select(),
    } satisfies Prisma.erp_hrm_role_permissionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmRolePermission.IList> {
    return {
      items: await ArrayUtil.asyncMap(
        [input],
        ErpHrmRolePermissionTransformer.transform,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmRolePermissionAtListTransformer {
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
//       export async function transform(input: Payload): Promise<IErpHrmRolePermission.IList> {
//         return {
//   items: {Array<IErpHrmRolePermission>},
//         };
//       }
//     }
//--------------------------------------------------------------