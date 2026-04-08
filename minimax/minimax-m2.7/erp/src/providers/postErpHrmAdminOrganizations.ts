import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmOrganizationCollector } from "../collectors/ErpHrmOrganizationCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmOrganizationTransformer } from "../transformers/ErpHrmOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminOrganizations(props: {
  admin: AdminPayload;
  body: IErpHrmOrganization.ICreate;
}): Promise<IErpHrmOrganization> {
  // Check organization name uniqueness across platform
  const existingOrg = await MyGlobal.prisma.erp_hrm_organizations.findFirst({
    where: { name: props.body.name },
    select: { id: true },
  });
  if (existingOrg) {
    throw new HttpException("Organization name already exists", 409);
  }
  // Get admin session and admin info
  const adminSession = await MyGlobal.prisma.erp_hrm_admin_sessions.findFirst({
    where: { id: props.admin.session_id },
    select: { erp_hrm_admin_id: true },
  });
  if (!adminSession) {
    throw new HttpException("Invalid session", 401);
  }
  // Get admin by id and include email for member lookup
  const adminRecord = await MyGlobal.prisma.erp_hrm_admins.findFirst({
    where: { id: adminSession.erp_hrm_admin_id },
    select: { id: true, email: true },
  });
  if (!adminRecord) {
    throw new HttpException("Admin not found", 404);
  }
  // Look up member by admin's email
  const memberRecord = await MyGlobal.prisma.erp_hrm_members.findUnique({
    where: { email: adminRecord.email },
    select: { id: true },
  });
  if (!memberRecord) {
    throw new HttpException("Member not found", 404);
  }
  // Create organization, roles, and employee in transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create organization using collector
    const organizationData = await ErpHrmOrganizationCollector.collect({
      body: props.body,
      erpHrmMembers: { id: memberRecord.id },
    });
    const organization = await tx.erp_hrm_organizations.create({
      data: organizationData,
    });
    // Generate role IDs
    const ownerRoleId = v4();
    const managerRoleId = v4();
    const employeeRoleId = v4();
    // Owner permissions - all 9 permissions
    const ownerPermissions = [
      "org:manage",
      "employee:manage",
      "employee:view",
      "project:manage",
      "project:view",
      "time:manage",
      "time:approve",
      "time:view_all",
      "report:view",
    ];
    // Manager permissions - 6 permissions
    const managerPermissions = [
      "org:manage",
      "employee:manage",
      "project:manage",
      "time:approve",
      "time:view_all",
      "report:view",
    ];
    // Employee permissions - 2 permissions
    const employeePermissions = ["project:view", "time:view_all"];
    // Create Owner role
    await tx.erp_hrm_roles.create({
      data: {
        id: ownerRoleId,
        erp_hrm_organization_id: organization.id,
        name: "Owner",
        is_builtin: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    // Create Manager role
    await tx.erp_hrm_roles.create({
      data: {
        id: managerRoleId,
        erp_hrm_organization_id: organization.id,
        name: "Manager",
        is_builtin: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    // Create Employee role
    await tx.erp_hrm_roles.create({
      data: {
        id: employeeRoleId,
        erp_hrm_organization_id: organization.id,
        name: "Employee",
        is_builtin: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    // Create role permissions for Owner
    for (const permission of ownerPermissions) {
      await tx.erp_hrm_role_permissions.create({
        data: {
          id: v4(),
          erp_hrm_role_id: ownerRoleId,
          permission: permission,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
    // Create role permissions for Manager
    for (const permission of managerPermissions) {
      await tx.erp_hrm_role_permissions.create({
        data: {
          id: v4(),
          erp_hrm_role_id: managerRoleId,
          permission: permission,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
    // Create role permissions for Employee
    for (const permission of employeePermissions) {
      await tx.erp_hrm_role_permissions.create({
        data: {
          id: v4(),
          erp_hrm_role_id: employeeRoleId,
          permission: permission,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
    // Create initial employee record for the owner with Owner role
    await tx.erp_hrm_employees.create({
      data: {
        id: v4(),
        erp_hrm_member_id: memberRecord.id,
        erp_hrm_organization_id: organization.id,
        erp_hrm_role_id: ownerRoleId,
        erp_hrm_department_id: null,
        position: null,
        employment_type: "full-time",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    return organization;
  });
  // Fetch the created organization with owner relation
  const created = await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow(
    {
      where: { id: result.id },
      ...ErpHrmOrganizationTransformer.select(),
    },
  );
  return await ErpHrmOrganizationTransformer.transform(created);
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
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmAdminOrganizations(props: {
//   admin: AdminPayload;
//   body: IErpHrmOrganization.ICreate;
// }): Promise<IErpHrmOrganization> {
//   const record = await MyGlobal.prisma.erp_hrm_organizations.create({
//     data: await ErpHrmOrganizationCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmOrganizationTransformer.select(),
//   });
//   return await ErpHrmOrganizationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------