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
import { ErpHrmTimeEmployeeContractTransformer } from "../transformers/ErpHrmTimeEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmTimeEmployeeContract.IRequest;
}): Promise<IPageIErpHrmTimeEmployeeContract.ISummary> {
  await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
    where: {
      id: props.employeeId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_time_organization_id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.erp_hrm_time_employee_contractsWhereInput = {
    erp_hrm_time_employee_id: props.employeeId,
    ...(props.body.search !== undefined
      ? {
          notes: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
  };
  const data = await MyGlobal.prisma.erp_hrm_time_employee_contracts.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ start_date: "asc" }, { created_at: "asc" }, { id: "asc" }],
    ...ErpHrmTimeEmployeeContractTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_time_employee_contracts.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeEmployeeContractTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
