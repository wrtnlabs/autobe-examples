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

export async function deleteErpHrmTimeMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const membership =
      await prisma.erp_hrm_time_organization_memberships.findFirst({
        where: {
          erp_hrm_time_member_id: props.member.id,
          is_selected_context: true,
          deleted_at: null,
        },
        select: {
          erp_hrm_time_organization_id: true,
        },
      });
    if (membership === null) {
      throw new HttpException("Project not found", 404);
    }
    const project = await prisma.erp_hrm_time_projects.findFirst({
      where: {
        id: props.projectId,
        erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
      },
      select: {
        id: true,
      },
    });
    if (project === null) {
      throw new HttpException("Project not found", 404);
    }
    const timelog = await prisma.erp_hrm_time_timelogs.findFirst({
      where: {
        erp_hrm_time_project_id: props.projectId,
      },
      select: {
        id: true,
      },
    });
    if (timelog !== null) {
      throw new HttpException(
        "Project cannot be deleted because timelogs exist.",
        409,
      );
    }
    await prisma.erp_hrm_time_projects.delete({
      where: {
        id: props.projectId,
      },
    });
  });
}
