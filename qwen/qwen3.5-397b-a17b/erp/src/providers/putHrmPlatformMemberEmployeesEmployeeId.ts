import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        id: true,
        organization_id: true,
      },
    });
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirst({
      where: {
        member: { id: props.member.id },
        organization: { id: employee.organization_id },
      },
    });
  if (!membership) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.department_id !== undefined) {
    if (props.body.department_id !== null) {
      await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
        where: {
          id: props.body.department_id,
          organization: { id: employee.organization_id },
        },
      });
    }
  }
  if (props.body.role_id !== undefined) {
    await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
      where: {
        id: props.body.role_id,
        organization: { id: employee.organization_id },
      },
    });
  }
  await MyGlobal.prisma.hrm_platform_employees.update({
    where: { id: props.employeeId },
    data: {
      ...(props.body.department_id !== undefined && {
        department_id: props.body.department_id,
      }),
      ...(props.body.position !== undefined && {
        position: props.body.position,
      }),
      ...(props.body.employment_type !== undefined && {
        employment_type: props.body.employment_type,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.role_id !== undefined && { role_id: props.body.role_id }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      ...HrmPlatformEmployeeTransformer.select(),
    });
  return await HrmPlatformEmployeeTransformer.transform(updated);
}
