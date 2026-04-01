import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeEmployeeContractAtSummaryTransformer } from "../transformers/ErpHrmTimeEmployeeContractAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberEmployeeContractsHistory(props: {
  member: MemberPayload;
}): Promise<IPageIErpHrmTimeEmployeeContract.ISummary> {
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
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        erp_hrm_time_member_id: props.member.id,
        erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const page: number = 1;
  const limit: number = 100;
  const skip: number = 0;
  const where = {
    erp_hrm_time_employee_id: employee.id,
  } satisfies Prisma.erp_hrm_time_employee_contractsWhereInput;
  const data = await MyGlobal.prisma.erp_hrm_time_employee_contracts.findMany({
    where,
    skip,
    take: limit,
    orderBy: [
      { start_date: "asc" },
      { end_date: "asc" },
      { created_at: "asc" },
      { id: "asc" },
    ],
    ...ErpHrmTimeEmployeeContractAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_time_employee_contracts.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeEmployeeContractAtSummaryTransformer.transform,
    ),
  };
}
