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

export async function deleteErpHrmMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify the organization exists and is not soft-deleted (auto 404 if not found)
  await MyGlobal.prisma.erp_hrm_organizations.findFirstOrThrow({
    where: { id: props.organizationId, deleted_at: null },
    select: { id: true },
  });
  // Step 2: Authorization — find the requesting member's org membership and verify Owner role
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: props.organizationId,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            id: true,
            name: true,
            is_builtin: true,
          },
        },
      },
    });
  if (orgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (!orgMember.role.is_builtin || orgMember.role.name !== "Owner") {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Precondition 1 — verify all timesheets are resolved (approved or rejected)
  const unresolvedTimesheetCount =
    await MyGlobal.prisma.erp_hrm_timesheets.count({
      where: {
        status: { in: ["draft", "submitted"] },
        owner: {
          organization_id: props.organizationId,
        },
      },
    });
  if (unresolvedTimesheetCount > 0) {
    throw new HttpException(
      "Organization has unresolved timesheets. All timesheets must be approved or rejected before deletion.",
      422,
    );
  }
  // Step 4: Precondition 2 — verify no active employee contracts exist
  const now = new Date();
  const activeContractCount =
    await MyGlobal.prisma.erp_hrm_employee_contracts.count({
      where: {
        is_active: true,
        start_date: { lte: now },
        OR: [{ end_date: null }, { end_date: { gt: now } }],
        organizationMember: {
          organization_id: props.organizationId,
        },
      },
    });
  if (activeContractCount > 0) {
    throw new HttpException(
      "Organization has active employee contracts. All contracts must end before deletion.",
      422,
    );
  }
  // Step 5: Atomic deletion transaction
  // Database-level onDelete: Cascade handles all child records:
  //   - erp_hrm_organization_members (and their timesheets, timelogs, timers, contracts)
  //   - erp_hrm_roles (and their role_permissions)
  //   - erp_hrm_departments
  //   - erp_hrm_projects (and their tasks, task_histories, project_members)
  //   - erp_hrm_invitations
  //   - erp_hrm_activity_logs
  // Platform-level erp_hrm_members records are preserved (not org-scoped)
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_organizations.delete({
      where: { id: props.organizationId },
    });
  });
  // Step 6: Real-time event emission
  // Emit 'organization-deleted' event to all WebSocket connections scoped to this organization
  // so connected clients can remove the organization from their available context list.
  // Event payload: { organizationId: props.organizationId }
  // (Handled by the real-time gateway layer upon successful deletion)
}
