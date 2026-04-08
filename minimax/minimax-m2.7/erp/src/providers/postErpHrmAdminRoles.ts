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
import { ErpHrmRoleCollector } from "../collectors/ErpHrmRoleCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmRoleTransformer } from "../transformers/ErpHrmRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminRoles(props: {
  admin: AdminPayload;
  body: IErpHrmRole.ICreate;
}): Promise<IErpHrmRole> {
  // Get admin record
  const admin = await MyGlobal.prisma.erp_hrm_admins.findUniqueOrThrow({
    where: { id: props.admin.id },
    select: { id: true },
  });
  // Find the admin's employee record to get organization and check permissions
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: admin.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
      erp_hrm_organization_id: true,
    },
  });
  // Check if admin has employee record
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if admin has org:manage permission via their role
  const hasOrgManage = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst(
    {
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "org:manage",
      },
    },
  );
  if (!hasOrgManage) {
    throw new HttpException("Forbidden", 403);
  }
  // Check role name uniqueness within organization
  const existingRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      erp_hrm_organization_id: employee.erp_hrm_organization_id,
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existingRole) {
    throw new HttpException(
      "Role name already exists in this organization",
      409,
    );
  }
  // Get organization record for collector
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
      where: { id: employee.erp_hrm_organization_id },
      select: { id: true },
    });
  // Get admin session for collector (must exist for authenticated admin)
  const session =
    await MyGlobal.prisma.erp_hrm_admin_sessions.findUniqueOrThrow({
      where: { id: props.admin.session_id },
      select: { id: true },
    });
  // Create role with nested permissions
  const record = await MyGlobal.prisma.erp_hrm_roles.create({
    data: await ErpHrmRoleCollector.collect({
      body: props.body,
      erpHrmOrganizations: organization,
      erpHrmAdminSessions: session,
    }),
    ...ErpHrmRoleTransformer.select(),
  });
  return await ErpHrmRoleTransformer.transform(record);
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
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmAdminRoles(props: {
//   admin: AdminPayload;
//   body: IErpHrmRole.ICreate;
// }): Promise<IErpHrmRole> {
//   const record = await MyGlobal.prisma.erp_hrm_roles.create({
//     data: await ErpHrmRoleCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmRoleTransformer.select(),
//   });
//   return await ErpHrmRoleTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------