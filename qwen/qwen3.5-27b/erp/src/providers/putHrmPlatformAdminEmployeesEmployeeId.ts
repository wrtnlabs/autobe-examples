import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformEmployeeTransformer } from "../transformers/HrmPlatformEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformAdminEmployeesEmployeeId(props: {
  admin: AdminPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmPlatformEmployee.IUpdate;
}): Promise<IHrmPlatformEmployee> {
  // Find the employee record by ID
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // Admins have platform-wide access, no organization validation needed
  // Validate department_id if provided
  if (
    props.body.department_id != null &&
    props.body.department_id !== undefined
  ) {
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: {
        id: props.body.department_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  }
  // Validate role_id if provided
  if (props.body.role_id !== undefined) {
    await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
      where: {
        id: props.body.role_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  }
  // Validate employment_type if provided
  if (props.body.employment_type !== undefined) {
    const validEmploymentTypes = [
      "full-time",
      "part-time",
      "contractor",
      "intern",
    ];
    if (!validEmploymentTypes.includes(props.body.employment_type)) {
      throw new HttpException("Invalid employment_type value", 400);
    }
  }
  // Validate status if provided
  if (props.body.status !== undefined) {
    const validStatuses = ["active", "deactivated"];
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException("Invalid status value", 400);
    }
  }
  // Update the employee record
  const updated = await MyGlobal.prisma.hrm_platform_employees.update({
    where: {
      id: props.employeeId,
    },
    data: {
      ...(props.body.department_id != null && {
        department_id: props.body.department_id,
      }),
      ...(props.body.role_id !== undefined && { role_id: props.body.role_id }),
      ...(props.body.employment_type !== undefined && {
        employment_type: props.body.employment_type,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: new Date(),
    },
    ...HrmPlatformEmployeeTransformer.select(),
  });
  return await HrmPlatformEmployeeTransformer.transform(updated);
}
