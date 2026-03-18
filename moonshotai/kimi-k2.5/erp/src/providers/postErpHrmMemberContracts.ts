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
import { ErpHrmContractCollector } from "../collectors/ErpHrmContractCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmContractTransformer } from "../transformers/ErpHrmContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberContracts(props: {
  member: MemberPayload;
  body: IErpHrmContract.ICreate;
}): Promise<IErpHrmContract> {
  // Verify organization member exists
  await MyGlobal.prisma.erp_hrm_organization_members.findUniqueOrThrow({
    where: { id: props.body.organization_member_id },
  });
  // Find and end any existing active contract for this organization member
  const existingActiveContract =
    await MyGlobal.prisma.erp_hrm_contracts.findFirst({
      where: {
        organization_member_id: props.body.organization_member_id,
        is_active: true,
      },
    });
  if (existingActiveContract !== null) {
    // Calculate end date as one day before the new contract start date
    const newStartDate = new Date(props.body.start_date);
    const endDate = new Date(newStartDate);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
    await MyGlobal.prisma.erp_hrm_contracts.update({
      where: { id: existingActiveContract.id },
      data: {
        is_active: false,
        end_date: endDate,
        updated_at: new Date(),
      },
    });
  }
  // Create new contract using collector
  const created = await MyGlobal.prisma.erp_hrm_contracts.create({
    data: await ErpHrmContractCollector.collect({
      body: props.body,
      organizationMember: { id: props.body.organization_member_id },
    }),
    ...ErpHrmContractTransformer.select(),
  });
  // Transform and return
  return ErpHrmContractTransformer.transform(created);
}
