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
  const allowedRoles: readonly ["member", "project-lead"] = [
    "member",
    "project-lead",
  ];
  if (
    !allowedRoles.includes(
      props.body.membership_role as unknown as "member" | "project-lead",
    )
  ) {
    throw new HttpException("Invalid membership_role", 400);
  }
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
  const employee =
    await MyGlobal.prisma.erp_hrm_time_tracking_members.findUniqueOrThrow({
      where: { id: props.body.employee_id },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (employee.deleted_at !== null) {
    throw new HttpException("Employee is deleted", 400);
  }
  const callerPermission =
    await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findFirst({
      where: {
        project_id: props.projectId,
        employee_id: props.member.id,
        deleted_at: null,
        membership_role: "project-lead",
      },
      select: { id: true },
    });
  if (callerPermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  const now = toISOStringSafe(new Date());
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const existing =
      await tx.erp_hrm_time_tracking_project_memberships.findUnique({
        where: {
          project_id_employee_id: {
            project_id: props.projectId,
            employee_id: props.body.employee_id,
          },
        },
        select: { id: true, deleted_at: true },
      });
    if (existing !== null && existing.deleted_at === null) {
      throw new HttpException("Project membership already exists", 409);
    }
    const membership =
      existing !== null
        ? await tx.erp_hrm_time_tracking_project_memberships.update({
            where: {
              project_id_employee_id: {
                project_id: props.projectId,
                employee_id: props.body.employee_id,
              },
            },
            data: {
              deleted_at: null,
              membership_role: props.body.membership_role,
              updated_at: now,
            },
          })
        : await tx.erp_hrm_time_tracking_project_memberships.create({
            data: await ErpHrmTimeTrackingProjectMembershipCollector.collect({
              body: props.body,
              project: project,
              employee: employee,
            }),
          });
    await tx.erp_hrm_time_tracking_activity_log_entries.create({
      data: {
        id: v4() satisfies string & tags.Format<"uuid">,
        organization_id: project.erp_hrm_time_tracking_organization_id,
        performed_by_member_id: props.member.id,
        action_type: "project_membership_created",
        target_entity_type: "erp_hrm_time_tracking_project_memberships",
        target_entity_id: membership.id,
        summary: "Project membership assignment created or reactivated",
        details: null,
        occurred_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    const created =
      await tx.erp_hrm_time_tracking_project_memberships.findUniqueOrThrow({
        where: { id: membership.id },
        ...ErpHrmTimeTrackingProjectMembershipTransformer.select(),
      });
    return await ErpHrmTimeTrackingProjectMembershipTransformer.transform(
      created,
    );
  });
}
