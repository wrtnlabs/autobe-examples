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
  await MyGlobal.prisma.$transaction(async (tx) => {
    const membership =
      await tx.erp_hrm_time_tracking_project_memberships.findUniqueOrThrow({
        where: { id: props.membershipId },
        select: {
          id: true,
          project_id: true,
          employee_id: true,
          deleted_at: true,
          created_at: true,
          updated_at: true,
        },
      });
    if (membership.deleted_at !== null) {
      throw new HttpException("Membership is not currently active", 409);
    }
    if (membership.project_id !== props.projectId) {
      throw new HttpException(
        "Membership does not belong to the specified project",
        409,
      );
    }
    const project = await tx.erp_hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: {
        id: true,
        erp_hrm_time_tracking_organization_id: true,
        deleted_at: true,
      },
    });
    if (project.deleted_at !== null) {
      throw new HttpException("Project is deleted", 404);
    }
    // authorization placeholder
    // activity log placeholder
    const now = new Date();
    await tx.erp_hrm_time_tracking_project_memberships.update({
      where: { id: props.membershipId },
      data: { deleted_at: now, updated_at: now },
    });
    await tx.erp_hrm_time_tracking_activity_log_entries.create({
      data: {
        id: v4(),
        organization_id: project.erp_hrm_time_tracking_organization_id,
        performed_by_member_id: props.member.id,
        action_type: "project_membership_removed",
        target_entity_type: "project_membership",
        target_entity_id: membership.id,
        summary: "Project membership removed",
        details: undefined,
        occurred_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  });
}
