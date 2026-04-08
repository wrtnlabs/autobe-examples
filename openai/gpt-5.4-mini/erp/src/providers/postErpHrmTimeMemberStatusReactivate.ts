import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeEmployeeDashboardSummaryTransformer } from "../transformers/ErpHrmTimeEmployeeDashboardSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberStatusReactivate(props: {
  member: MemberPayload;
}): Promise<IErpHrmTimeEmployeeDashboardSummary> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        erp_hrm_time_member_id: true,
        status: true,
      },
    });
  const selectedOrganizationId = employee.erp_hrm_time_organization_id;
  if (selectedOrganizationId === undefined || selectedOrganizationId === null) {
    throw new HttpException("Organization context not found", 403);
  }
  if (employee.status === "active") {
    throw new HttpException("Employee is already active", 400);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_employees.update({
      where: {
        id: employee.id,
      },
      data: {
        status: "active",
        updated_at: new Date(),
      },
    });
    await prisma.erp_hrm_time_activity_log_entries.create({
      data: {
        id: v4(),
        organization_id: selectedOrganizationId,
        member_id: props.member.id,
        action_type: "employee_reactivated",
        target_entity_type: "employee",
        target_entity_id: employee.id,
        details: "Employee reactivated in the current organization",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_employees.findUniqueOrThrow({
      where: {
        id: employee.id,
      },
      ...ErpHrmTimeEmployeeDashboardSummaryTransformer.select(),
    });
  return await ErpHrmTimeEmployeeDashboardSummaryTransformer.transform(updated);
}
