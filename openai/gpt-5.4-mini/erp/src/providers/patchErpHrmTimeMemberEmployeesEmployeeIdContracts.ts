import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
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

export async function patchErpHrmTimeMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmTimeEmployeeContract.IRequest;
}): Promise<IPageIErpHrmTimeEmployeeContract.ISummary> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        id: true,
        erp_hrm_time_member_id: true,
        erp_hrm_time_organization_id: true,
      },
    });
  const selfEmployee: boolean =
    employee.erp_hrm_time_member_id === props.member.id;
  if (selfEmployee === false) {
    const membership =
      await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
        where: {
          erp_hrm_time_member_id: props.member.id,
          erp_hrm_time_organization_id: employee.erp_hrm_time_organization_id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (membership === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search;
  const sort: string | undefined = props.body.sort;
  const where = {
    erp_hrm_time_employee_id: props.employeeId,
    deleted_at: null,
    ...(search === undefined
      ? {}
      : {
          notes: {
            contains: search,
            mode: "insensitive",
          },
        }),
  } satisfies Prisma.erp_hrm_time_employee_contractsWhereInput;
  const orderBy =
    sort === "updatedAtDesc"
      ? ({
          updated_at: "desc",
        } satisfies Prisma.erp_hrm_time_employee_contractsOrderByWithRelationInput)
      : sort === "startDateDesc"
        ? ({
            start_date: "desc",
          } satisfies Prisma.erp_hrm_time_employee_contractsOrderByWithRelationInput)
        : ({
            start_date: "asc",
            id: "asc",
          } satisfies Prisma.erp_hrm_time_employee_contractsOrderByWithRelationInput);
  const data = await MyGlobal.prisma.erp_hrm_time_employee_contracts.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...ErpHrmTimeEmployeeContractAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_time_employee_contracts.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeEmployeeContractAtSummaryTransformer.transform,
    ),
  };
}
