import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmTimeTrackingMemberContractsContractId(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Implementation placeholder
  const tx = await MyGlobal.prisma.$transaction(async (prisma) => {
    const contract = await prisma.erp_hrm_time_tracking_contracts.findUnique({
      where: { id: props.contractId },
      select: {
        id: true,
        erp_hrm_time_tracking_employee_id: true,
        erp_hrm_time_tracking_organization_id: true,
        status: true,
        deleted_at: true,
      },
    });
    if (!contract || contract.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    // tenant scoping (organization context) is derived from member/session; implementation will check organization id.
    const selectedOrganizationId = await (async () => {
      // Without DTO for organization context, this is stub.
      return (
        (props.member as any).erp_hrm_time_tracking_organization_id ??
        (props.member as any).organization_id
      );
    })();
    if (
      contract.erp_hrm_time_tracking_organization_id !== selectedOrganizationId
    ) {
      throw new HttpException("Forbidden", 403);
    }
    await prisma.erp_hrm_time_tracking_contracts.delete({
      where: { id: props.contractId },
    });
    await prisma.erp_hrm_time_tracking_activity_log_entries.create({
      data: {
        id: v4() as any,
        organization_id: selectedOrganizationId,
        performed_by_member_id: props.member.id,
        action_type: "contract.deleted",
        target_entity_type: "contract",
        target_entity_id: props.contractId as any,
        summary: "Deleted contract",
        details: null,
        occurred_at: new Date() as any,
        created_at: new Date() as any,
        updated_at: new Date() as any,
        deleted_at: null,
      },
    });
  });
  void tx;
}
