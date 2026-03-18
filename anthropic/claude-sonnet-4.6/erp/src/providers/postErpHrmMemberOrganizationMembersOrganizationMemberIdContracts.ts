import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmEmployeeContractCollector } from "../collectors/ErpHrmEmployeeContractCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmEmployeeContractTransformer } from "../transformers/ErpHrmEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberOrganizationMembersOrganizationMemberIdContracts(props: {
  member: MemberPayload;
  organizationMemberId: string & tags.Format<"uuid">;
  body: IErpHrmEmployeeContract.ICreate;
}): Promise<IErpHrmEmployeeContract> {
  // Step 1: Verify target organization member exists and is not deleted
  const targetMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        id: props.organizationMemberId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      },
    });
  // Step 2: Resolve caller's organization member in the same organization
  const callerMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        organization_id: targetMember.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  // Step 3: Check caller has employee:manage permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      role_id: callerMember.role_id,
      permission_code: "employee:manage",
    },
    select: { id: true },
  });
  if (permission === null) {
    throw new HttpException(
      "Forbidden: requires employee:manage permission",
      403,
    );
  }
  // Step 4: Execute in a transaction — deactivate old contract, create new, log activity
  const createdContractId = await MyGlobal.prisma.$transaction(async (tx) => {
    // 4a. Deactivate existing active contract if any
    const existingActive = await tx.erp_hrm_employee_contracts.findFirst({
      where: {
        organization_member_id: props.organizationMemberId,
        is_active: true,
      },
      select: { id: true },
    });
    if (existingActive !== null) {
      await tx.erp_hrm_employee_contracts.update({
        where: { id: existingActive.id },
        data: {
          is_active: false,
          updated_at: new Date(),
        },
      });
    }
    // 4b. Create new contract using collector
    const created = await tx.erp_hrm_employee_contracts.create({
      data: await ErpHrmEmployeeContractCollector.collect({
        body: props.body,
        erpHrmOrganizationMembers: { id: props.organizationMemberId },
        erpHrmMembers: { id: props.member.id },
        erpHrmMemberSessions: { id: props.member.session_id },
      }),
      select: { id: true },
    });
    // 4c. Create activity log entry (scalar FKs only — no relation connect)
    await tx.erp_hrm_activity_logs.create({
      data: {
        id: v4(),
        organization_id: targetMember.organization_id,
        organization_member_id: callerMember.id,
        action_type: "contract_created",
        target_entity_type: "contract",
        target_entity_id: created.id,
        details: `start_date=${props.body.startDate};pay_period=${props.body.payPeriod}`,
        created_at: new Date(),
      },
    });
    return created.id;
  });
  // Step 5: Fetch and return the new contract using the transformer
  const newContract =
    await MyGlobal.prisma.erp_hrm_employee_contracts.findUniqueOrThrow({
      where: { id: createdContractId },
      ...ErpHrmEmployeeContractTransformer.select(),
    });
  return ErpHrmEmployeeContractTransformer.transform(newContract);
}
