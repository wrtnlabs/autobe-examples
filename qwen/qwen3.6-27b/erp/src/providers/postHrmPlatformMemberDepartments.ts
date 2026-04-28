import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformDepartmentCollector } from "../collectors/HrmPlatformDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentTransformer } from "../transformers/HrmPlatformDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberDepartments(props: {
  member: MemberPayload;
  body: IHrmPlatformDepartment.ICreate;
}): Promise<IHrmPlatformDepartment> {
  // 1. Validate session exists and get organization context
  // The session table doesn't have organization_id column
  // Organization context comes from the JWT token payload
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { id: true, hrm_platform_member_id: true },
    });
  if (session.hrm_platform_member_id !== props.member.id) {
    throw new HttpException("Invalid session", 401);
  }
  // Lookup the organization via employee record for this member
  // Members have an employee record in their active organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_member_id: props.member.id,
      deleted_at: null,
    },
    select: { hrm_platform_organization_id: true },
  });
  if (employee === null) {
    throw new HttpException("Organization context is required", 401);
  }
  const organizationId = employee.hrm_platform_organization_id;
  // 2. Validate name is not empty
  if (props.body.name.length === 0) {
    throw new HttpException("Department name is required", 400);
  }
  // 3. Validate parent_department_id if provided
  if (
    props.body.parent_department_id !== undefined &&
    props.body.parent_department_id !== null
  ) {
    const parent =
      await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
        where: { id: props.body.parent_department_id },
        select: {
          id: true,
          hrm_platform_organization_id: true,
          deleted_at: true,
          hrm_platform_parent_department_id: true,
        },
      });
    if (parent.hrm_platform_organization_id !== organizationId) {
      throw new HttpException(
        "Parent department must belong to the same organization",
        400,
      );
    }
    if (parent.deleted_at !== null) {
      throw new HttpException("Parent department is deleted", 400);
    }
    if (parent.hrm_platform_parent_department_id !== null) {
      throw new HttpException("Parent department already has a parent", 400);
    }
  }
  // 4. Validate name uniqueness within organization (active records only)
  const existing = await MyGlobal.prisma.hrm_platform_departments.findFirst({
    where: {
      hrm_platform_organization_id: organizationId,
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException(
      "Department name already exists in this organization",
      400,
    );
  }
  // 5. Create department using collector and transformer
  const record = await MyGlobal.prisma.hrm_platform_departments.create({
    data: await HrmPlatformDepartmentCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: { id: organizationId },
    }),
    ...HrmPlatformDepartmentTransformer.select(),
  });
  return await HrmPlatformDepartmentTransformer.transform(record);
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformMemberDepartments(props: {
//   member: MemberPayload;
//   body: IHrmPlatformDepartment.ICreate;
// }): Promise<IHrmPlatformDepartment> {
//   const record = await MyGlobal.prisma.hrm_platform_departments.create({
//     data: await HrmPlatformDepartmentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformDepartmentTransformer.select(),
//   });
//   return await HrmPlatformDepartmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------