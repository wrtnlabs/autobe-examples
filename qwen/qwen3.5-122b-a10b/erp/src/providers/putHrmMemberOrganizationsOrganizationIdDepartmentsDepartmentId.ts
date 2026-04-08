import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmDepartmentTransformer } from "../transformers/HrmDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmMemberOrganizationsOrganizationIdDepartmentsDepartmentId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmDepartment.IUpdate;
}): Promise<IHrmDepartment> {
  // Validate department exists and is not soft-deleted
  const department = await MyGlobal.prisma.hrm_departments.findUniqueOrThrow({
    where: {
      id: props.departmentId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
      parent_department_id: true,
    },
  });
  // Validate department belongs to the organization
  if (department.organization_id !== props.organizationId) {
    throw new HttpException("Department not found in organization", 404);
  }
  // Validate parent department if provided
  if (
    props.body.parent_department_id !== undefined &&
    props.body.parent_department_id !== null
  ) {
    const parentDepartmentId = props.body.parent_department_id;
    // Self-reference check
    if (parentDepartmentId === props.departmentId) {
      throw new HttpException("Self-reference is not allowed", 400);
    }
    // Check if parent exists and is in the same organization
    const parentDepartment = await MyGlobal.prisma.hrm_departments.findUnique({
      where: {
        id: parentDepartmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        parent_department_id: true,
      },
    });
    if (!parentDepartment) {
      throw new HttpException("Parent department not found", 404);
    }
    // Validate parent is in the same organization
    if (parentDepartment.organization_id !== props.organizationId) {
      throw new HttpException(
        "Parent department not in the same organization",
        400,
      );
    }
    // One-level nesting constraint: parent must be root-level (has no parent itself)
    if (parentDepartment.parent_department_id !== null) {
      throw new HttpException(
        "Parent department cannot have a parent (one-level nesting constraint)",
        400,
      );
    }
  }
  // Update the department
  await MyGlobal.prisma.hrm_departments.update({
    where: { id: props.departmentId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.parent_department_id !== undefined &&
        props.body.parent_department_id !== null && {
          parent_department_id: props.body.parent_department_id,
        }),
      updated_at: new Date(),
    },
  });
  // Fetch and return the updated department with full details
  const updated = await MyGlobal.prisma.hrm_departments.findUniqueOrThrow({
    where: { id: props.departmentId },
    ...HrmDepartmentTransformer.select(),
  });
  return await HrmDepartmentTransformer.transform(updated);
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
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmMemberOrganizationsOrganizationIdDepartmentsDepartmentId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   departmentId: string & tags.Format<"uuid">;
//   body: IHrmDepartment.IUpdate;
// }): Promise<IHrmDepartment> {
//   await MyGlobal.prisma.hrm_departments.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_departments.findUniqueOrThrow({
//     where: { ... },
//     ...HrmDepartmentTransformer.select(),
//   });
//   return await HrmDepartmentTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------