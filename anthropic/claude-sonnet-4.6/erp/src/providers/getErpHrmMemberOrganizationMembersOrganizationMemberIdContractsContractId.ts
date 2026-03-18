import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmEmployeeContractTransformer } from "../transformers/ErpHrmEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberOrganizationMembersOrganizationMemberIdContractsContractId(props: {
  member: MemberPayload;
  organizationMemberId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<IErpHrmEmployeeContract> {
  // Step 1: Find the target organization member, verify not deleted
  const targetOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        id: props.organizationMemberId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role_id: true,
      },
    });
  // Step 2: Find the caller's org member record in the same organization
  const callerOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: targetOrgMember.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (callerOrgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Authorization check
  const isSelf = callerOrgMember.id === props.organizationMemberId;
  if (!isSelf) {
    // Check if the caller has employee:view permission
    const viewPermission =
      await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
        where: {
          role_id: callerOrgMember.role_id,
          permission_code: "employee:view",
        },
        select: { id: true },
      });
    if (viewPermission === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 4: Fetch the specific contract
  const contract =
    await MyGlobal.prisma.erp_hrm_employee_contracts.findFirstOrThrow({
      where: {
        id: props.contractId,
        organization_member_id: props.organizationMemberId,
      },
      ...ErpHrmEmployeeContractTransformer.select(),
    });
  // Step 5: Transform and return
  return ErpHrmEmployeeContractTransformer.transform(contract);
}
