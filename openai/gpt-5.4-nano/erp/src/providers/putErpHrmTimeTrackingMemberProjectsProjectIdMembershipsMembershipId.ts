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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingProjectMembershipTransformer } from "../transformers/ErpHrmTimeTrackingProjectMembershipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeTrackingMemberProjectsProjectIdMembershipsMembershipId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingProjectMembership.IUpdate;
}): Promise<IErpHrmTimeTrackingProjectMembership> {
  return await MyGlobal.prisma.$transaction(async (transaction) => {
    const nowIso = toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">;
    const membership =
      await transaction.erp_hrm_time_tracking_project_memberships.findUniqueOrThrow(
        {
          where: { id: props.membershipId },
          select: {
            id: true,
            project_id: true,
            employee_id: true,
            membership_role: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      );
    if (membership.project_id !== props.projectId) {
      throw new HttpException("Invalid scope", 400);
    }
    if (membership.deleted_at !== null) {
      throw new HttpException("Membership is not updatable", 400);
    }
    await transaction.erp_hrm_time_tracking_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        id: true,
      },
    });
    const project =
      await transaction.erp_hrm_time_tracking_projects.findUniqueOrThrow({
        where: { id: props.projectId },
        select: {
          id: true,
          deleted_at: true,
          erp_hrm_time_tracking_organization_id: true,
        },
      });
    if (project.deleted_at !== null) {
      throw new HttpException("Project is not available", 400);
    }
    const nextMembershipRole =
      props.body.membership_role === undefined
        ? membership.membership_role
        : props.body.membership_role;
    if (nextMembershipRole.trim().length < 1) {
      throw new HttpException("Invalid membership role", 400);
    }
    if (props.body.membership_role !== undefined) {
      await transaction.erp_hrm_time_tracking_project_memberships.update({
        where: { id: props.membershipId },
        data: {
          membership_role: nextMembershipRole,
          updated_at: nowIso,
        },
      });
    } else {
      await transaction.erp_hrm_time_tracking_project_memberships.update({
        where: { id: props.membershipId },
        data: {
          updated_at: nowIso,
        },
      });
    }
    const updated =
      await transaction.erp_hrm_time_tracking_project_memberships.findUniqueOrThrow(
        {
          where: { id: props.membershipId },
          ...ErpHrmTimeTrackingProjectMembershipTransformer.select(),
        },
      );
    return await ErpHrmTimeTrackingProjectMembershipTransformer.transform(
      updated,
    );
  });
}
