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

export async function postErpHrmTimeMemberStatusDeactivate(props: {
  member: MemberPayload;
  body: IErpHrmTimeEmployeeDashboardSummary.IUpdate;
}): Promise<IErpHrmTimeEmployeeDashboardSummary> {
  const employee = await MyGlobal.prisma.erp_hrm_time_employees.findFirst({
    where: {
      erp_hrm_time_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_time_organization_id: true,
      status: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.status !== "active") {
    throw new HttpException("Employee is already deactivated", 409);
  }
  const updatedEmployee = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_employees.update({
      where: {
        id: employee.id,
      },
      data: {
        status: "deactivated",
        updated_at: new Date(),
      },
    });
    return await prisma.erp_hrm_time_employees.findUniqueOrThrow({
      where: {
        id: employee.id,
      },
      ...ErpHrmTimeEmployeeDashboardSummaryTransformer.select(),
    });
  });
  return await ErpHrmTimeEmployeeDashboardSummaryTransformer.transform(
    updatedEmployee,
  );
}
