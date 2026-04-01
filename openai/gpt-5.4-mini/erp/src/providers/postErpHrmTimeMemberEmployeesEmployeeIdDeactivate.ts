import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeEmployeeTransformer } from "../transformers/ErpHrmTimeEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberEmployeesEmployeeIdDeactivate(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeEmployee> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        erp_hrm_time_member_id: true,
        erp_hrm_time_role_id: true,
        erp_hrm_time_department_id: true,
        position_title: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (employee.status === "deactivated") {
    throw new HttpException("Employee is already deactivated", 409);
  }
  const timestamp = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_employees.update({
      where: { id: employee.id },
      data: {
        status: "deactivated",
        updated_at: new Date(timestamp),
      },
    });
    await prisma.erp_hrm_time_activity_log_entries.create({
      data: {
        id: v4(),
        organization_id: employee.erp_hrm_time_organization_id,
        member_id: props.member.id,
        action_type: "employee.deactivated",
        target_entity_type: "employee",
        target_entity_id: employee.id,
        details: `Deactivated employee ${employee.id} at ${timestamp}`,
        created_at: new Date(timestamp),
        updated_at: new Date(timestamp),
        deleted_at: null,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_employees.findUniqueOrThrow({
      where: { id: employee.id },
      ...ErpHrmTimeEmployeeTransformer.select(),
    });
  return await ErpHrmTimeEmployeeTransformer.transform(updated);
}
