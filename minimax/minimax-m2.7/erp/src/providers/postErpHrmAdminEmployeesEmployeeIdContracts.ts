import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmContractCollector } from "../collectors/ErpHrmContractCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmContractTransformer } from "../transformers/ErpHrmContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminEmployeesEmployeeIdContracts(props: {
  admin: AdminPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmContract.ICreate;
}): Promise<IErpHrmContract> {
  // Validate employee exists
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    select: { id: true },
  });
  // Check for existing active contract (end_date IS NULL)
  const existingActiveContract =
    await MyGlobal.prisma.erp_hrm_contracts.findFirst({
      where: {
        erp_hrm_employee_id: props.employeeId,
        end_date: null,
      },
      select: {
        id: true,
      },
    });
  const newContractStartDate = new Date(props.body.start_date);
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  // If existing active contract found and new contract starts now or in the past,
  // end the existing contract one day before
  if (existingActiveContract) {
    const newStartDate = new Date(newContractStartDate);
    newStartDate.setHours(0, 0, 0, 0);
    if (newStartDate <= currentDate) {
      // End the existing contract one day before new contract starts
      const endDate = new Date(newContractStartDate);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      await MyGlobal.prisma.erp_hrm_contracts.update({
        where: { id: existingActiveContract.id },
        data: {
          end_date: endDate,
          updated_at: new Date(),
        },
      });
    }
  }
  // Create new contract using collector
  const createdContract = await MyGlobal.prisma.erp_hrm_contracts.create({
    data: await ErpHrmContractCollector.collect({
      body: props.body,
      erpHrmEmployees: employee,
    }),
    ...ErpHrmContractTransformer.select(),
  });
  return await ErpHrmContractTransformer.transform(createdContract);
}
