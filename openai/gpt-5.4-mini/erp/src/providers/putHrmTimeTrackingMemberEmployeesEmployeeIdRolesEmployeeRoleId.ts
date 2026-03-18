import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingEmployeeTransformer } from "../transformers/HrmTimeTrackingEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberEmployeesEmployeeIdRolesEmployeeRoleId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  employeeRoleId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingEmployee> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        id: true,
        organization_id: true,
        role_id: true,
      },
    });
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findUniqueOrThrow({
    where: { id: props.employeeRoleId },
    select: {
      id: true,
      organization_id: true,
    },
  });
  if (employee.organization_id !== role.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  if (employee.role_id !== props.employeeRoleId) {
    await MyGlobal.prisma.hrm_time_tracking_employees.update({
      where: { id: props.employeeId },
      data: {
        role_id: props.employeeRoleId,
      },
    });
  }
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      ...HrmTimeTrackingEmployeeTransformer.select(),
    });
  return await HrmTimeTrackingEmployeeTransformer.transform(updated);
}
