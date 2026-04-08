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
import { ErpHrmTimeEmployeeDashboardSummaryCollector } from "../collectors/ErpHrmTimeEmployeeDashboardSummaryCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeEmployeeDashboardSummaryTransformer } from "../transformers/ErpHrmTimeEmployeeDashboardSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberEmployees(props: {
  member: MemberPayload;
  body: IErpHrmTimeEmployeeDashboardSummary.ICreate;
}): Promise<IErpHrmTimeEmployeeDashboardSummary> {
  const currentMembership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          is_selected_context: true,
          status: "active",
        },
        select: {
          erp_hrm_time_organization_id: true,
          erp_hrm_time_member_id: true,
          organization: {
            select: {
              id: true,
            },
          },
        },
      },
    );
  const existingEmployee =
    await MyGlobal.prisma.erp_hrm_time_employees.findUnique({
      where: {
        erp_hrm_time_organization_id_erp_hrm_time_member_id: {
          erp_hrm_time_organization_id:
            currentMembership.erp_hrm_time_organization_id,
          erp_hrm_time_member_id: props.body.member_id,
        },
      },
      select: {
        id: true,
      },
    });
  if (existingEmployee !== null) {
    throw new HttpException(
      "Employee already exists in this organization",
      409,
    );
  }
  const created = await MyGlobal.prisma.erp_hrm_time_employees.create({
    data: await ErpHrmTimeEmployeeDashboardSummaryCollector.collect({
      body: props.body,
      organization: currentMembership.organization,
    }),
    ...ErpHrmTimeEmployeeDashboardSummaryTransformer.select(),
  });
  return await ErpHrmTimeEmployeeDashboardSummaryTransformer.transform(created);
}
