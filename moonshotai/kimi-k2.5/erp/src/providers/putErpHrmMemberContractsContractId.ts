import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmContractTransformer } from "../transformers/ErpHrmContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberContractsContractId(props: {
  member: MemberPayload;
  contractId: string;
  body: IErpHrmContract.IUpdate;
}): Promise<IErpHrmContract> {
  // First verify the contract exists and check its status
  const existingContract = await MyGlobal.prisma.erp_hrm_contracts.findUnique({
    where: {
      id: props.contractId,
      deleted_at: null,
    },
    select: {
      is_active: true,
      end_date: true,
    },
  });
  if (!existingContract) {
    throw new HttpException("Contract not found", 404);
  }
  if (existingContract.is_active !== true) {
    throw new HttpException(
      "Cannot update inactive contract. Historical contracts are immutable.",
      403,
    );
  }
  if (existingContract.end_date !== null) {
    throw new HttpException(
      "Cannot update historical contract that has ended.",
      403,
    );
  }
  // Build update data - only include explicitly provided fields
  const updateData: Prisma.erp_hrm_contractsUpdateInput = {
    ...(props.body.employment_type !== undefined && {
      employment_type: props.body.employment_type,
    }),
    ...(props.body.pay_rate !== undefined && {
      pay_rate: props.body.pay_rate,
    }),
    ...(props.body.pay_period !== undefined && {
      pay_period: props.body.pay_period,
    }),
    ...(props.body.working_hours_per_week !== undefined && {
      working_hours_per_week: props.body.working_hours_per_week,
    }),
    ...(props.body.notes !== undefined && {
      notes: props.body.notes,
    }),
    updated_at: new Date(),
  };
  // Perform update and return updated record
  const updated = await MyGlobal.prisma.erp_hrm_contracts.update({
    where: {
      id: props.contractId,
    },
    data: updateData,
    ...ErpHrmContractTransformer.select(),
  });
  return await ErpHrmContractTransformer.transform(updated);
}
