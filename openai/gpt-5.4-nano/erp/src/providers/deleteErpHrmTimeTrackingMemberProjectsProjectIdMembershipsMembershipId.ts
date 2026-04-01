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

export async function deleteErpHrmTimeTrackingMemberProjectsProjectIdMembershipsMembershipId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = toISOStringSafe(
    undefined as unknown as Parameters<typeof toISOStringSafe>[0],
  );
  const [membership, project] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findFirst({
      where: {
        id: props.membershipId,
        deleted_at: null,
      },
      select: {
        id: true,
        project_id: true,
        employee_id: true,
      },
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_projects.findFirst({
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_tracking_organization_id: true,
      },
    }),
  ]);
  if (
    membership === null ||
    membership.project_id !== props.projectId ||
    project === null
  ) {
    throw new HttpException("Membership not found", 404);
  }
  const actorProjectMembership =
    await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findFirst({
      where: {
        project_id: props.projectId,
        employee_id: props.member.id,
        deleted_at: null,
        membership_role: "project-lead",
      },
      select: { id: true },
    });
  if (actorProjectMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_tracking_project_memberships.update({
      where: { id: membership.id },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
    const logId = v4(
      undefined as unknown as Parameters<typeof v4>[0],
    ) as string;
    await tx.erp_hrm_time_tracking_activity_log_entries.create({
      data: {
        id: logId as string & tags.Format<"uuid">,
        organization_id: project.erp_hrm_time_tracking_organization_id,
        performed_by_member_id: props.member.id,
        action_type: "project_membership_removed",
        target_entity_type: "erp_hrm_time_tracking_project_memberships",
        target_entity_id: membership.id,
        summary: "Removed project membership",
        details: `projectId=${props.projectId}, membershipId=${membership.id}`,
        occurred_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  });
}
