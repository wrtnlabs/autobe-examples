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

export async function postErpHrmTimeMemberEmployeesEmployeeIdReactivate(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeEmployee> {
  const current = await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow(
    {
      where: {
        id: props.employeeId,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        status: true,
      },
    },
  );
  if (current.status !== "deactivated") {
    throw new HttpException("Employee is already active", 400);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_employees.update({
      where: {
        id: props.employeeId,
      },
      data: {
        status: "active",
        updated_at: new Date(),
      },
    });
    await prisma.erp_hrm_time_activity_log_entries.create({
      data: {
        id: v4(),
        organization_id: current.erp_hrm_time_organization_id,
        member_id: props.member.id,
        action_type: "employee.reactivated",
        target_entity_type: "employee",
        target_entity_id: props.employeeId,
        details: "Employee reactivated.",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
      },
      ...ErpHrmTimeEmployeeTransformer.select(),
    });
  return await ErpHrmTimeEmployeeTransformer.transform(updated);
}
