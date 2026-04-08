import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
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
import { ErpHrmTimeEmployeeContractCollector } from "../collectors/ErpHrmTimeEmployeeContractCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeEmployeeContractTransformer } from "../transformers/ErpHrmTimeEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmTimeEmployeeContract.ICreate;
}): Promise<IErpHrmTimeEmployeeContract> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
      },
    });
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const active = await prisma.erp_hrm_time_employee_contracts.findFirst({
      where: {
        erp_hrm_time_employee_id: employee.id,
        deleted_at: null,
        end_date: null,
      },
      orderBy: {
        start_date: "desc",
      },
      select: {
        id: true,
      },
    });
    if (active !== null) {
      await prisma.erp_hrm_time_employee_contracts.update({
        where: {
          id: active.id,
        },
        data: {
          end_date: props.body.startDate,
          updated_at: props.body.startDate,
        },
      });
    }
    return await prisma.erp_hrm_time_employee_contracts.create({
      data: await ErpHrmTimeEmployeeContractCollector.collect({
        body: props.body,
        employee,
      }),
      ...ErpHrmTimeEmployeeContractTransformer.select(),
    });
  });
  return await ErpHrmTimeEmployeeContractTransformer.transform(created);
}
