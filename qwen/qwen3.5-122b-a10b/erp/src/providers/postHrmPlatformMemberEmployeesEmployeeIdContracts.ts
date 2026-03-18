import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformContractCollector } from "../collectors/HrmPlatformContractCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformContractTransformer } from "../transformers/HrmPlatformContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmPlatformContract.ICreate;
}): Promise<IHrmPlatformContract> {
  // Step 1: Validate employee exists and is active
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: { id: true, status: true },
    });
  if (employee.status !== "active") {
    throw new HttpException(
      "Cannot create contract for inactive employee",
      400,
    );
  }
  // Step 2: Check for existing active contract
  const existingActiveContract =
    await MyGlobal.prisma.hrm_platform_contracts.findFirst({
      where: {
        hrm_platform_employee_id: props.employeeId,
        end_date: null,
      },
    });
  // Step 3: Create new contract with transaction
  const newContract = await MyGlobal.prisma.$transaction(async (tx) => {
    // End existing active contract if found
    if (existingActiveContract) {
      const newStartDate = new Date(props.body.start_date);
      const previousEndDate = new Date(newStartDate);
      previousEndDate.setDate(previousEndDate.getDate() - 1);
      await tx.hrm_platform_contracts.update({
        where: { id: existingActiveContract.id },
        data: {
          end_date: previousEndDate,
          updated_at: new Date(),
        },
      });
    }
    // Create new contract
    const createInput = await HrmPlatformContractCollector.collect({
      body: props.body,
    });
    return await tx.hrm_platform_contracts.create({
      data: {
        ...createInput,
        id: v4(),
        employee: { connect: { id: props.employeeId } },
      },
      ...HrmPlatformContractTransformer.select(),
    });
  });
  // Step 4: Transform and return
  return await HrmPlatformContractTransformer.transform(newContract);
}
