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
import { ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer } from "../transformers/ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberEmployees(props: {
  member: MemberPayload;
  body: IErpHrmTimeEmployeeDashboardSummary.IRequest;
}): Promise<IPageIErpHrmTimeEmployeeDashboardSummary.ISummary> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          is_selected_context: true,
          deleted_at: null,
        },
        select: {
          erp_hrm_time_organization_id: true,
        },
      },
    );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderBy =
    props.body.sort === "updated_at"
      ? { updated_at: "desc" as Prisma.SortOrder }
      : { created_at: "desc" as Prisma.SortOrder };
  const where: Prisma.erp_hrm_time_employeesWhereInput = {
    erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
    deleted_at: null,
    ...(props.body.departmentId !== null &&
    props.body.departmentId !== undefined
      ? { erp_hrm_time_department_id: props.body.departmentId }
      : {}),
    ...(props.body.employmentType !== null &&
    props.body.employmentType !== undefined
      ? { employment_type: props.body.employmentType }
      : {}),
    ...(props.body.status !== null && props.body.status !== undefined
      ? { status: props.body.status }
      : {}),
    ...(props.body.search !== undefined && props.body.search !== null
      ? {
          member: {
            is: {},
          },
        }
      : {}),
  };
  const data = await MyGlobal.prisma.erp_hrm_time_employees.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_time_employees.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.transform,
    ),
  };
}
