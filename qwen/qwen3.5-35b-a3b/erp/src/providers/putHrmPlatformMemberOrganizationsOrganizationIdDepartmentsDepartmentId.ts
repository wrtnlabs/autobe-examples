import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentTransformer } from "../transformers/HrmPlatformDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberOrganizationsOrganizationIdDepartmentsDepartmentId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmPlatformDepartment.IUpdate;
}): Promise<IHrmPlatformDepartment> {
  // Verify department exists, belongs to organization, and is not soft-deleted
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: {
        id: props.departmentId,
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        parent_department_id: true,
      },
    });
  // Validate name uniqueness if provided and differs from current name
  if (props.body.name !== undefined && props.body.name !== department.name) {
    const existing = await MyGlobal.prisma.hrm_platform_departments.findFirst({
      where: {
        organization_id: props.organizationId,
        name: props.body.name,
        id: { not: props.departmentId },
        deleted_at: null,
      },
    });
    if (existing !== null) {
      throw new HttpException(
        "Department name must be unique within the organization",
        400,
      );
    }
  }
  // Validate parent_department_id if provided
  if (props.body.parent_department_id !== undefined) {
    if (props.body.parent_department_id !== null) {
      const parentDepartment =
        await MyGlobal.prisma.hrm_platform_departments.findUnique({
          where: {
            id: props.body.parent_department_id,
            organization_id: props.organizationId,
            deleted_at: null,
          },
        });
      if (parentDepartment === null) {
        throw new HttpException(
          "Parent department not found in the organization",
          400,
        );
      }
    }
  }
  // Build update data with timestamp
  const updateData: Prisma.hrm_platform_departmentsUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.parent_department_id !== undefined && {
      parent_department_id: props.body.parent_department_id,
    }),
    updated_at: new Date(),
  };
  await MyGlobal.prisma.hrm_platform_departments.update({
    where: { id: props.departmentId },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      ...HrmPlatformDepartmentTransformer.select(),
    });
  return await HrmPlatformDepartmentTransformer.transform(updated);
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
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberOrganizationsOrganizationIdDepartmentsDepartmentId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   departmentId: string & tags.Format<"uuid">;
//   body: IHrmPlatformDepartment.IUpdate;
// }): Promise<IHrmPlatformDepartment> {
//   await MyGlobal.prisma.hrm_platform_departments.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformDepartmentTransformer.select(),
//   });
//   return await HrmPlatformDepartmentTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------