import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeTransformer } from "../transformers/HrmPlatformEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmPlatformEmployee.IUpdate;
}): Promise<IHrmPlatformEmployee> {
  const empOrg = await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow(
    {
      where: { id: props.employeeId },
      select: {
        deleted_at: true,
        hrm_platform_organization_id: true,
      },
    },
  );
  if (empOrg.deleted_at !== null) {
    throw new HttpException("Employee not found", 404);
  }
  const organizationId = empOrg.hrm_platform_organization_id;
  const memberInOrg = await MyGlobal.prisma.hrm_platform_employees.findUnique({
    where: {
      hrm_platform_organization_id_hrm_platform_member_id: {
        hrm_platform_organization_id: organizationId,
        hrm_platform_member_id: props.member.id,
      },
    },
    select: { hrm_platform_role_id: true },
  });
  if (memberInOrg === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.department_id !== undefined ||
    props.body.role_id !== undefined ||
    props.body.status !== undefined
  ) {
    const hasPermission =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          hrm_platform_role_id: memberInOrg.hrm_platform_role_id,
          permission_key: "employee:manage",
        },
      });
    if (hasPermission === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  if (
    props.body.department_id !== undefined &&
    props.body.department_id !== null
  ) {
    const deptInOrg = await MyGlobal.prisma.hrm_platform_departments.findFirst({
      where: {
        id: props.body.department_id,
        hrm_platform_organization_id: organizationId,
      },
    });
    if (deptInOrg === null) {
      throw new HttpException(
        "Department does not belong to the organization",
        400,
      );
    }
  }
  if (props.body.role_id !== undefined) {
    const roleInOrg = await MyGlobal.prisma.hrm_platform_roles.findFirst({
      where: {
        id: props.body.role_id,
        hrm_platform_organization_id: organizationId,
      },
    });
    if (roleInOrg === null) {
      throw new HttpException("Role does not belong to the organization", 400);
    }
  }
  if (props.body.status !== undefined) {
    if (props.body.status !== "active" && props.body.status !== "deactivated") {
      throw new HttpException("Invalid status value", 400);
    }
  }
  await MyGlobal.prisma.hrm_platform_employees.update({
    where: { id: props.employeeId },
    data: {
      ...(props.body.department_id !== undefined && {
        hrm_platform_department_id: props.body.department_id,
      }),
      ...(props.body.employment_type !== undefined && {
        employment_type: props.body.employment_type,
      }),
      ...(props.body.position !== undefined && {
        position: props.body.position,
      }),
      ...(props.body.role_id !== undefined && {
        hrm_platform_role_id: props.body.role_id,
      }),
      ...(props.body.status !== undefined && {
        status: props.body.status,
      }),
      updated_at: new Date().toISOString(),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      ...HrmPlatformEmployeeTransformer.select(),
    });
  return await HrmPlatformEmployeeTransformer.transform(updated);
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
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberEmployeesEmployeeId(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
//   body: IHrmPlatformEmployee.IUpdate;
// }): Promise<IHrmPlatformEmployee> {
//   await MyGlobal.prisma.hrm_platform_employees.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformEmployeeTransformer.select(),
//   });
//   return await HrmPlatformEmployeeTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------