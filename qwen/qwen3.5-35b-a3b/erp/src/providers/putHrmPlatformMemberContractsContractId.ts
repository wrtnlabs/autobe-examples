import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformContractTransformer } from "../transformers/HrmPlatformContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberContractsContractId(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
  body: IHrmPlatformContract.IUpdate;
}): Promise<IHrmPlatformContract> {
  const currentContract =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      select: {
        id: true,
        status: true,
        hrm_platform_employee_id: true,
        end_date: true,
        start_date: true,
        hrm_platform_organization_id: true,
      },
    });
  if (currentContract.status !== "active") {
    throw new HttpException("Cannot update ended contract", 409);
  }
  const now = new Date();
  const updateData: Prisma.hrm_platform_contractsUpdateInput = {
    updated_at: now,
  };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.start_date !== undefined) {
    updateData.start_date = new Date(props.body.start_date);
  }
  if (props.body.end_date !== undefined) {
    updateData.end_date =
      props.body.end_date === null ? null : new Date(props.body.end_date);
  }
  if (props.body.compensation_amount !== undefined) {
    updateData.compensation_amount = props.body.compensation_amount;
  }
  if (props.body.compensation_currency !== undefined) {
    updateData.compensation_currency = props.body.compensation_currency;
  }
  if (props.body.notes !== undefined) {
    updateData.notes = props.body.notes;
  }
  if (updateData.end_date !== undefined) {
    const newEndDate: Date | null = updateData.end_date as Date | null;
    const conflictingContracts =
      await MyGlobal.prisma.hrm_platform_contracts.findMany({
        where: {
          hrm_platform_employee_id: currentContract.hrm_platform_employee_id,
          status: "active",
          id: { not: props.contractId },
          AND: [
            {
              start_date: { lt: newEndDate as Date },
            },
            {
              OR: [
                { end_date: null },
                { end_date: { gte: newEndDate as Date } },
              ],
            },
          ],
        },
      });
    if (conflictingContracts.length > 0) {
      throw new HttpException("Conflicting active contract exists", 409);
    }
  }
  const updated = await MyGlobal.prisma.hrm_platform_contracts.update({
    where: { id: props.contractId },
    data: updateData,
    ...HrmPlatformContractTransformer.select(),
  });
  return await HrmPlatformContractTransformer.transform(updated);
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
// import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberContractsContractId(props: {
//   member: MemberPayload;
//   contractId: string & tags.Format<"uuid">;
//   body: IHrmPlatformContract.IUpdate;
// }): Promise<IHrmPlatformContract> {
//   await MyGlobal.prisma.hrm_platform_contracts.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformContractTransformer.select(),
//   });
//   return await HrmPlatformContractTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------