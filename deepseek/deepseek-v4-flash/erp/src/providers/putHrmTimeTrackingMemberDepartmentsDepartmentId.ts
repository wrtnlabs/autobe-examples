import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingDepartmentTransformer } from "../transformers/HrmTimeTrackingDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingDepartment.IUpdate;
}): Promise<IHrmTimeTrackingDepartment> {
  // 1. Find the department - must exist and NOT be soft-deleted
  const department =
    await MyGlobal.prisma.hrm_time_tracking_departments.findFirst({
      where: {
        id: props.departmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
        parent_id: true,
        name: true,
      },
    });
  if (department === null) {
    throw new HttpException("Department not found", 404);
  }
  // 2. Find the member's employee record in the department's organization
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id:
        department.hrm_time_tracking_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Department not found", 404);
  }
  // 3. Check permission: Owner or org:manage permission
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
    where: { id: employee.hrm_time_tracking_role_id },
    select: { id: true, name: true, type: true },
  });
  const isOwner = role.name === "Owner" && role.type === "built_in";
  if (!isOwner) {
    const hasOrgManage =
      await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
        where: {
          hrm_time_tracking_role_id: role.id,
          permission_code: "org:manage",
          deleted_at: null,
        },
      });
    if (hasOrgManage === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 4. Validate unique name within organization
  const existingWithName =
    await MyGlobal.prisma.hrm_time_tracking_departments.findFirst({
      where: {
        hrm_time_tracking_organization_id:
          department.hrm_time_tracking_organization_id,
        name: props.body.name,
        id: { not: props.departmentId },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingWithName !== null) {
    throw new HttpException(
      "Department name already exists within the organization",
      400,
    );
  }
  // 5. Build update data
  const now = new Date();
  const updateData: Record<string, unknown> = {
    name: props.body.name,
    updated_at: now,
  };
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.parentId !== undefined) {
    if (props.body.parentId === null) {
      // Promote to top-level — always allowed
      updateData.parent_id = null;
    } else {
      // Validate parent department
      if (props.body.parentId === props.departmentId) {
        throw new HttpException("A department cannot be its own parent", 400);
      }
      const parentDepartment =
        await MyGlobal.prisma.hrm_time_tracking_departments.findFirst({
          where: {
            id: props.body.parentId,
            hrm_time_tracking_organization_id:
              department.hrm_time_tracking_organization_id,
            deleted_at: null,
          },
          select: { id: true },
        });
      if (parentDepartment === null) {
        throw new HttpException("Parent department not found", 404);
      }
      // Validate one-level nesting: only top-level departments can be assigned as children
      if (department.parent_id !== null) {
        throw new HttpException(
          "Only top-level departments can be assigned as child departments",
          400,
        );
      }
      updateData.parent_id = props.body.parentId;
    }
  }
  // 6. Update the department
  await MyGlobal.prisma.hrm_time_tracking_departments.update({
    where: { id: props.departmentId },
    data: updateData,
  });
  // 7. Return updated department using transformer
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      ...HrmTimeTrackingDepartmentTransformer.select(),
    });
  return await HrmTimeTrackingDepartmentTransformer.transform(updated);
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
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmTimeTrackingMemberDepartmentsDepartmentId(props: {
//   member: MemberPayload;
//   departmentId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingDepartment.IUpdate;
// }): Promise<IHrmTimeTrackingDepartment> {
//   await MyGlobal.prisma.hrm_time_tracking_departments.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_time_tracking_departments.findUniqueOrThrow({
//     where: { ... },
//     ...HrmTimeTrackingDepartmentTransformer.select(),
//   });
//   return await HrmTimeTrackingDepartmentTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------