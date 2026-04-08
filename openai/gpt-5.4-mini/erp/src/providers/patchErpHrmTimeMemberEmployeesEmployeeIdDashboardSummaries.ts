import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployeeDashboardSummary";
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

export async function patchErpHrmTimeMemberEmployeesEmployeeIdDashboardSummaries(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmTimeEmployeeDashboardSummary.IRequest;
}): Promise<IPageIErpHrmTimeEmployeeDashboardSummary> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const snapshot =
    await MyGlobal.prisma.erp_hrm_time_employee_dashboard_summaries.findUnique({
      where: {
        erp_hrm_time_employee_id: employee.id,
      },
      ...ErpHrmTimeEmployeeDashboardSummaryTransformer.select(),
    });
  if (snapshot === null) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      },
    };
  }
  return {
    data: [
      await ErpHrmTimeEmployeeDashboardSummaryTransformer.transform(snapshot),
    ],
    pagination: {
      current: page,
      limit,
      records: 1,
      pages: 1,
    },
  };
}
