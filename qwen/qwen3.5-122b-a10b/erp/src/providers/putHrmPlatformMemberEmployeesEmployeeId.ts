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
  // 1. Fetch employee with organization and role context
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        hrm_platform_role_id: true,
      },
    });
  // 2. Verify employee:manage permission in the organization
  const roleWithPermission = await MyGlobal.prisma.hrm_platform_roles.findFirst(
    {
      where: {
        id: employee.hrm_platform_role_id,
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        permissions: {
          some: {
            permission: {
              code: "employee:manage",
            },
          },
        },
      },
    },
  );
  if (!roleWithPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate department exists in organization if provided
  let departmentId: (string & tags.Format<"uuid">) | undefined = undefined;
  if (
    props.body.departmentId !== undefined &&
    props.body.departmentId !== null
  ) {
    const department = await MyGlobal.prisma.hrm_platform_departments.findFirst(
      {
        where: {
          id: props.body.departmentId,
          hrm_platform_organization_id: employee.hrm_platform_organization_id,
          deleted_at: null,
        },
      },
    );
    if (!department) {
      throw new HttpException("Department not found in organization", 400);
    }
    departmentId = props.body.departmentId;
  }
  // 4. Validate employmentType if provided
  let employmentType:
    | "full-time"
    | "part-time"
    | "contractor"
    | "intern"
    | undefined = undefined;
  if (
    props.body.employmentType !== undefined &&
    props.body.employmentType !== null
  ) {
    employmentType = typia.assert<
      "full-time" | "part-time" | "contractor" | "intern"
    >(props.body.employmentType);
  }
  // 5. Update employee record
  const data: Prisma.hrm_platform_employeesUpdateInput = {
    ...(departmentId !== undefined && {
      hrm_platform_department_id: departmentId,
    }),
    ...(props.body.position !== undefined &&
      props.body.position !== null && {
        position: props.body.position,
      }),
    ...(employmentType !== undefined && {
      employment_type: employmentType,
    }),
    updated_at: new Date(),
  };
  await MyGlobal.prisma.hrm_platform_employees.update({
    where: { id: props.employeeId },
    data,
  });
  // 6. Fetch updated employee with all relations for transformation
  const updated =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      ...HrmPlatformEmployeeTransformer.select(),
    });
  // 7. Transform and return
  return await HrmPlatformEmployeeTransformer.transform(updated);
}
