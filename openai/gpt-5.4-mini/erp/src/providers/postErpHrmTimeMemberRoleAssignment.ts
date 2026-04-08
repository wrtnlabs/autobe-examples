import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
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

export async function postErpHrmTimeMemberRoleAssignment(props: {
  member: MemberPayload;
  body: IErpHrmTimeOrganizationMembership.ICreate;
}): Promise<IErpHrmTimeEmployeeDashboardSummary> {
  const selectedMembership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        is_selected_context: true,
        deleted_at: null,
        status: "active",
      },
      select: {
        erp_hrm_time_organization_id: true,
      },
    });
  if (selectedMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  const targetEmployee = await MyGlobal.prisma.erp_hrm_time_employees.findFirst(
    {
      where: {
        id: props.body.employeeId,
        erp_hrm_time_organization_id:
          selectedMembership.erp_hrm_time_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
      },
    },
  );
  if (targetEmployee === null) {
    throw new HttpException("Employee not found", 404);
  }
  const targetRole = await MyGlobal.prisma.erp_hrm_time_roles.findFirst({
    where: {
      id: props.body.roleId,
      erp_hrm_time_organization_id:
        selectedMembership.erp_hrm_time_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (targetRole === null) {
    throw new HttpException("Role not found", 404);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_employees.update({
      where: {
        id: targetEmployee.id,
      },
      data: {
        role: {
          connect: {
            id: targetRole.id,
          },
        },
      },
    });
    return await tx.erp_hrm_time_employees.findUniqueOrThrow({
      where: {
        id: targetEmployee.id,
      },
      ...ErpHrmTimeEmployeeDashboardSummaryTransformer.select(),
    });
  });
  return await ErpHrmTimeEmployeeDashboardSummaryTransformer.transform(updated);
}
