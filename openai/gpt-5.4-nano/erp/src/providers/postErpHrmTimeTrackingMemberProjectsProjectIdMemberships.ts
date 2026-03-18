import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingProjectMembershipCollector } from "../collectors/ErpHrmTimeTrackingProjectMembershipCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingProjectMembershipTransformer } from "../transformers/ErpHrmTimeTrackingProjectMembershipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberProjectsProjectIdMemberships(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingProjectMembership.ICreate;
}): Promise<IErpHrmTimeTrackingProjectMembership> {
  const nowDate = new Date("2026-03-18T12:39:46.688Z");
  const project =
    await MyGlobal.prisma.erp_hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: {
        id: true,
        erp_hrm_time_tracking_organization_id: true,
        deleted_at: true,
      },
    });
  if (project.deleted_at !== null) {
    throw new HttpException("Project is deleted", 400);
  }
  const conflictActive =
    await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findFirst({
      where: {
        project_id: props.projectId,
        employee_id: props.body.employee_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (conflictActive !== null) {
    throw new HttpException(
      "Membership already exists for this employee and project",
      409,
    );
  }
  const conflictDeleted =
    await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findFirst({
      where: {
        project_id: props.projectId,
        employee_id: props.body.employee_id,
        deleted_at: { not: null },
      },
      select: { id: true },
    });
  const createdOrReactivated = await MyGlobal.prisma.$transaction(
    async (tx) => {
      if (conflictDeleted !== null) {
        await tx.erp_hrm_time_tracking_project_memberships.update({
          where: { id: conflictDeleted.id },
          data: {
            deleted_at: null,
            updated_at: nowDate,
          },
        });
      } else {
        const collected =
          await ErpHrmTimeTrackingProjectMembershipCollector.collect({
            body: props.body,
            project: { id: props.projectId } satisfies IEntity,
          });
        await tx.erp_hrm_time_tracking_project_memberships.create({
          data: {
            ...collected,
          },
        });
      }
      const membership =
        await tx.erp_hrm_time_tracking_project_memberships.findFirstOrThrow({
          where: {
            project_id: props.projectId,
            employee_id: props.body.employee_id,
            deleted_at: null,
          },
          ...ErpHrmTimeTrackingProjectMembershipTransformer.select(),
        });
      const membershipLogId = v4() satisfies string & tags.Format<"uuid">;
      await tx.erp_hrm_time_tracking_activity_log_entries.create({
        data: {
          id: membershipLogId,
          organization_id: project.erp_hrm_time_tracking_organization_id,
          performed_by_member_id: props.member.id,
          action_type: "project_membership_created",
          target_entity_type: "project_membership",
          target_entity_id: membership.id,
          summary: "Project membership assignment created",
          details: null,
          occurred_at: nowDate,
          created_at: nowDate,
          updated_at: nowDate,
          deleted_at: null,
        },
      });
      return membership;
    },
  );
  return await ErpHrmTimeTrackingProjectMembershipTransformer.transform(
    createdOrReactivated,
  );
}
