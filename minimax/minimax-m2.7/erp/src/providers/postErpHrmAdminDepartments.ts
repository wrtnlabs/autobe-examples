import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmDepartmentCollector } from "../collectors/ErpHrmDepartmentCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmDepartmentTransformer } from "../transformers/ErpHrmDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminDepartments(props: {
  admin: AdminPayload;
  body: IErpHrmDepartment.ICreate;
}): Promise<IErpHrmDepartment> {
  // Query the admin to verify existence
  const adminRecord = await MyGlobal.prisma.erp_hrm_admins.findUniqueOrThrow({
    where: { id: props.admin.id },
    select: { id: true },
  });
  // Get organization context from the system
  const organization = await MyGlobal.prisma.erp_hrm_organizations.findFirst({
    select: { id: true },
  });
  if (!organization) {
    throw new HttpException("No organization found", 404);
  }
  const organizationId = organization.id;
  // Validate parent department if provided
  if (props.body.parentId) {
    const parentDept = await MyGlobal.prisma.erp_hrm_departments.findUnique({
      where: { id: props.body.parentId },
      select: { id: true, erp_hrm_organization_id: true, parent_id: true },
    });
    if (!parentDept) {
      throw new HttpException("Parent department not found", 404);
    }
    if (parentDept.erp_hrm_organization_id !== organizationId) {
      throw new HttpException(
        "Parent department belongs to a different organization",
        400,
      );
    }
    if (parentDept.parent_id !== null) {
      throw new HttpException(
        "Parent department already has a parent (only one level of hierarchy allowed)",
        400,
      );
    }
  }
  // Check name uniqueness within organization (exclude soft-deleted)
  const existingDept = await MyGlobal.prisma.erp_hrm_departments.findFirst({
    where: {
      erp_hrm_organization_id: organizationId,
      name: props.body.name,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existingDept) {
    throw new HttpException(
      "Department with this name already exists in the organization",
      409,
    );
  }
  // Create department using collector
  const created = await MyGlobal.prisma.erp_hrm_departments.create({
    data: await ErpHrmDepartmentCollector.collect({
      body: props.body,
      erpHrmOrganizations: { id: organizationId } satisfies IEntity,
    }),
    ...ErpHrmDepartmentTransformer.select(),
  });
  return await ErpHrmDepartmentTransformer.transform(created);
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
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmAdminDepartments(props: {
//   admin: AdminPayload;
//   body: IErpHrmDepartment.ICreate;
// }): Promise<IErpHrmDepartment> {
//   const record = await MyGlobal.prisma.erp_hrm_departments.create({
//     data: await ErpHrmDepartmentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmDepartmentTransformer.select(),
//   });
//   return await ErpHrmDepartmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------