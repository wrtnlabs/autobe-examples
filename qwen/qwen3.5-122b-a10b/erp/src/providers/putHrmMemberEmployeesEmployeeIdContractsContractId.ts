import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmContractTransformer } from "../transformers/HrmContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
  body: IHrmContract.IUpdate;
}): Promise<IHrmContract> {
  // 1. Find the contract and verify it belongs to the specified employee
  const contract = await MyGlobal.prisma.hrm_contracts.findFirstOrThrow({
    where: {
      id: props.contractId,
      hrm_employee_id: props.employeeId,
      deleted_at: null,
    },
    select: {
      id: true,
      end_date: true,
      hrm_employee_id: true,
      employee: {
        select: {
          organization_id: true,
        },
      },
    },
  });
  // 2. Validate contract is active (end_date is NULL)
  if (contract.end_date !== null) {
    throw new HttpException(
      "Contract is not active and cannot be modified",
      400,
    );
  }
  // 3. Build update data with only provided fields
  const updateData: Prisma.hrm_contractsUpdateInput = {
    updated_at: new Date(),
    ...(props.body.pay_rate !== undefined && { pay_rate: props.body.pay_rate }),
    ...(props.body.pay_period !== undefined && {
      pay_period: props.body.pay_period,
    }),
    ...(props.body.working_hours_per_week !== undefined && {
      working_hours_per_week: props.body.working_hours_per_week,
    }),
    ...(props.body.notes !== undefined && { notes: props.body.notes }),
  };
  // 4. Update the contract
  await MyGlobal.prisma.hrm_contracts.update({
    where: { id: props.contractId },
    data: updateData,
  });
  // 5. Log the activity
  const logId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.hrm_activity_logs.create({
    data: {
      id: logId,
      hrm_members_id: props.member.id,
      timestamp: new Date(),
      action_type: "contract.updated",
      target_entity_type: "Contract",
      target_entity_id: props.contractId,
      details: JSON.stringify({
        changes: Object.keys(props.body),
      }),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 6. Return the updated contract using transformer
  const updated = await MyGlobal.prisma.hrm_contracts.findUniqueOrThrow({
    where: { id: props.contractId },
    ...HrmContractTransformer.select(),
  });
  return await HrmContractTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmMemberEmployeesEmployeeIdContractsContractId(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
//   contractId: string & tags.Format<"uuid">;
//   body: IHrmContract.IUpdate;
// }): Promise<IHrmContract> {
//   await MyGlobal.prisma.hrm_contracts.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_contracts.findUniqueOrThrow({
//     where: { ... },
//     ...HrmContractTransformer.select(),
//   });
//   return await HrmContractTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------