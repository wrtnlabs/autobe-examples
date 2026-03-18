import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingEmployeeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeRole";
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
import { HrmTimeTrackingEmployeeRoleTransformer } from "../transformers/HrmTimeTrackingEmployeeRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberEmployeesEmployeeIdRoles(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingEmployeeRole> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        id: true,
        organization_id: true,
        role_id: true,
      },
    });
  if (employee.organization_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const activeAssignment =
      await prisma.hrm_time_tracking_employee_roles.findFirst({
        where: {
          hrm_time_tracking_employee_id: props.employeeId,
          deleted_at: null,
          effective_to: null,
        },
        orderBy: {
          effective_from: "desc",
        },
      });
    if (activeAssignment !== null) {
      await prisma.hrm_time_tracking_employee_roles.update({
        where: {
          id: activeAssignment.id,
        },
        data: {
          effective_to: now,
          updated_at: now,
        },
      });
    }
    const created = await prisma.hrm_time_tracking_employee_roles.create({
      data: {
        id: v4(),
        hrm_time_tracking_employee_id: props.employeeId,
        hrm_time_tracking_role_id: employee.role_id,
        effective_from: now,
        effective_to: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...HrmTimeTrackingEmployeeRoleTransformer.select(),
    });
    return await HrmTimeTrackingEmployeeRoleTransformer.transform(created);
  });
}
