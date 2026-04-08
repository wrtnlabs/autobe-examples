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
  // Find contract and validate it exists
  const existing =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      ...HrmPlatformContractTransformer.select(),
    });
  // Reject if contract status is ended (past contracts are immutable)
  if (existing.status === "ended") {
    throw new HttpException("Cannot update ended contract", 409);
  }
  // Determine the start date to use for overlap validation
  const effectiveStartDate: string & tags.Format<"date-time"> =
    props.body.start_date !== undefined
      ? props.body.start_date
      : (toISOStringSafe(existing.start_date) satisfies string);
  // Validate no overlapping active contracts when end_date is being changed
  if (props.body.end_date !== undefined && props.body.end_date !== null) {
    const overlappingContracts =
      await MyGlobal.prisma.hrm_platform_contracts.findMany({
        where: {
          hrm_platform_employee_id: existing.employee.id,
          id: { not: props.contractId },
          status: "active",
          deleted_at: null,
        },
        ...HrmPlatformContractTransformer.select(),
      });
    for (const otherContract of overlappingContracts) {
      const proposedEndDate: string & tags.Format<"date-time"> =
        props.body.end_date;
      const otherStartDate: string & tags.Format<"date-time"> = toISOStringSafe(
        otherContract.start_date,
      ) satisfies string;
      const otherEndDate: (string & tags.Format<"date-time">) | null =
        otherContract.end_date !== null
          ? (toISOStringSafe(otherContract.end_date) satisfies string)
          : null;
      // Overlap occurs if: proposed_end > other_start AND (other_end is null OR other_end > proposed_start)
      if (
        proposedEndDate > otherStartDate &&
        (otherEndDate === null || effectiveStartDate < otherEndDate)
      ) {
        throw new HttpException(
          "Cannot update contract: overlapping active contract exists",
          409,
        );
      }
    }
  }
  // Build update data with only updatable fields
  const currentTime: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updateData: {
    title?: string;
    start_date?: string & tags.Format<"date-time">;
    end_date?: (string & tags.Format<"date-time">) | null;
    compensation_amount?: number | null;
    compensation_currency?: string | null;
    notes?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: currentTime,
  };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.start_date !== undefined) {
    updateData.start_date = props.body.start_date;
  }
  if (props.body.end_date !== undefined) {
    updateData.end_date = props.body.end_date;
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
  // Update the contract
  await MyGlobal.prisma.hrm_platform_contracts.update({
    where: { id: props.contractId },
    data: updateData,
  });
  // Retrieve updated contract and transform
  const updated =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
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