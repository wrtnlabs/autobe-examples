import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformContractTransformer } from "../transformers/HrmPlatformContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformContractsContractId(props: {
  contractId: string & tags.Format<"uuid">;
  body: IHrmPlatformContract.IUpdate;
}): Promise<IHrmPlatformContract> {
  // Fetch the contract with employee and organization for validation
  const contract =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      select: {
        id: true,
        start_at: true,
        end_at: true,
        hrm_platform_organization_id: true,
      },
    });
  // Validate contract is active (end_at is null or in the future)
  if (contract.end_at !== null && contract.end_at < new Date()) {
    throw new HttpException(
      "Cannot update past contract - it is an immutable historical record",
      400,
    );
  }
  // Validate end_at if provided
  if (props.body.end_at !== undefined && props.body.end_at !== null) {
    const endAtDate = new Date(props.body.end_at);
    if (endAtDate < contract.start_at) {
      throw new HttpException("end_at must be on or after start_at", 400);
    }
  }
  // Validate pay_rate if provided
  if (props.body.pay_rate !== undefined && props.body.pay_rate <= 0) {
    throw new HttpException("pay_rate must be a positive number", 400);
  }
  // Validate working_hours_per_week if provided
  if (
    props.body.working_hours_per_week !== undefined &&
    props.body.working_hours_per_week <= 0
  ) {
    throw new HttpException(
      "working_hours_per_week must be a positive number",
      400,
    );
  }
  // Build update data
  const updateData: Prisma.hrm_platform_contractsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.pay_rate !== undefined) {
    updateData.pay_rate = props.body.pay_rate;
  }
  if (props.body.pay_period !== undefined) {
    updateData.pay_period = props.body.pay_period;
  }
  if (props.body.working_hours_per_week !== undefined) {
    updateData.working_hours_per_week = props.body.working_hours_per_week;
  }
  if (props.body.end_at !== undefined) {
    updateData.end_at =
      props.body.end_at === null ? null : new Date(props.body.end_at);
  }
  // Update the contract
  const updated = await MyGlobal.prisma.hrm_platform_contracts.update({
    where: { id: props.contractId },
    data: updateData,
    ...HrmPlatformContractTransformer.select(),
  });
  return await HrmPlatformContractTransformer.transform(updated);
}
