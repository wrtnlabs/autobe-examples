import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminPermissions(props: {
  admin: AdminPayload;
}): Promise<IErpHrmRolePermission.IList> {
  const records = await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
    select: {
      id: true,
      permission: true,
      created_at: true,
      updated_at: true,
      role: {
        select: {
          id: true,
          name: true,
          is_builtin: true,
          created_at: true,
          erp_hrm_organization_id: true,
          organization: {
            select: {
              id: true,
              name: true,
              created_at: true,
              currency: true,
              timezone: true,
              owner: {
                select: {
                  id: true,
                  email: true,
                  display_name: true,
                  avatar_uri: true,
                  phone: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
          _count: {
            select: {
              rolePermissions: true,
            },
          },
        },
      },
    },
    orderBy: {
      permission: "asc",
    },
  });
  return {
    items: records.map(
      (record) =>
        ({
          id: record.id as string & tags.Format<"uuid">,
          permission: record.permission as string &
            tags.Pattern<"^[a-z]+:[a-z_]+$">,
          role: {
            id: record.role.id as string & tags.Format<"uuid">,
            name: record.role.name,
            isBuiltin: record.role.is_builtin,
            createdAt: toISOStringSafe(record.role.created_at),
            organization: {
              id: record.role.organization.id as string & tags.Format<"uuid">,
              name: record.role.organization.name,
              created_at: toISOStringSafe(record.role.organization.created_at),
              currency: record.role.organization.currency,
              timezone: record.role.organization.timezone,
              owner: {
                id: record.role.organization.owner.id as string &
                  tags.Format<"uuid">,
                email: record.role.organization.owner.email as string &
                  tags.Format<"email">,
                createdAt: toISOStringSafe(
                  record.role.organization.owner.created_at,
                ),
                displayName: record.role.organization.owner.display_name,
              } satisfies IErpHrmMember.ISummary,
            } satisfies IErpHrmOrganization.ISummary,
            permissionsCount: record.role._count.rolePermissions as number &
              tags.Type<"int32">,
          } satisfies IErpHrmRole.ISummary,
          createdAt: toISOStringSafe(record.created_at),
          updatedAt: toISOStringSafe(record.updated_at),
        }) satisfies IErpHrmRolePermission,
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmAdminPermissions(props: {
//   admin: AdminPayload;
// }): Promise<IErpHrmRolePermission.IList> {
//   const record = await MyGlobal.prisma.erp_hrm_role_permissions.findFirstOrThrow({
//     ...ErpHrmRolePermissionAtListTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmRolePermissionAtListTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------