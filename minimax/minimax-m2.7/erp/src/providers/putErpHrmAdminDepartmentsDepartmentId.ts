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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmDepartmentTransformer } from "../transformers/ErpHrmDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmAdminDepartmentsDepartmentId(props: {
  admin: AdminPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IErpHrmDepartment.IUpdate;
}): Promise<IErpHrmDepartment> {
  // 1. Find existing department - must exist and not be soft-deleted
  const existing = await MyGlobal.prisma.erp_hrm_departments.findUniqueOrThrow({
    where: {
      id: props.departmentId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  // 2. Validate name uniqueness within organization (if name is being updated)
  if (props.body.name !== undefined) {
    const duplicate = await MyGlobal.prisma.erp_hrm_departments.findFirst({
      where: {
        erp_hrm_organization_id: existing.erp_hrm_organization_id,
        name: props.body.name,
        deleted_at: null,
        id: { not: props.departmentId },
      },
    });
    if (duplicate !== null) {
      throw new HttpException(
        "Department name already exists in this organization",
        400,
      );
    }
  }
  // 3. Validate parent department if provided (one-level hierarchy constraint)
  if (props.body.parentId !== undefined && props.body.parentId !== null) {
    const parent = await MyGlobal.prisma.erp_hrm_departments.findUnique({
      where: {
        id: props.body.parentId,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_organization_id: true,
        parent_id: true,
      },
    });
    if (parent === null) {
      throw new HttpException("Parent department not found", 404);
    }
    if (parent.erp_hrm_organization_id !== existing.erp_hrm_organization_id) {
      throw new HttpException(
        "Parent department must belong to the same organization",
        400,
      );
    }
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Cannot set a department as parent if it already has a parent (one-level hierarchy constraint)",
        400,
      );
    }
    if (parent.id === props.departmentId) {
      throw new HttpException("Department cannot be its own parent", 400);
    }
  }
  // 4. Build update data with only provided fields
  const updateData: {
    name?: string;
    description?: string | null;
    parent_id?: string | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.parentId !== undefined) {
    updateData.parent_id = props.body.parentId;
  }
  // 5. Update the department
  await MyGlobal.prisma.erp_hrm_departments.update({
    where: { id: props.departmentId },
    data: updateData,
  });
  // 6. Fetch updated department with full relations and return using transformer
  const updated = await MyGlobal.prisma.erp_hrm_departments.findUniqueOrThrow({
    where: { id: props.departmentId },
    ...ErpHrmDepartmentTransformer.select(),
  });
  return await ErpHrmDepartmentTransformer.transform(updated);
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
// export async function putErpHrmAdminDepartmentsDepartmentId(props: {
//   admin: AdminPayload;
//   departmentId: string & tags.Format<"uuid">;
//   body: IErpHrmDepartment.IUpdate;
// }): Promise<IErpHrmDepartment> {
//   await MyGlobal.prisma.erp_hrm_departments.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_departments.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmDepartmentTransformer.select(),
//   });
//   return await ErpHrmDepartmentTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------