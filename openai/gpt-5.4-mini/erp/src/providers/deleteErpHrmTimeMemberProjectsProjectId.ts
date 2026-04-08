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
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          is_selected_context: true,
          deleted_at: null,
        },
        select: {
          erp_hrm_time_organization_id: true,
        },
      },
    );
  const project = await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const timelog = await MyGlobal.prisma.erp_hrm_time_timelogs.findFirst({
    where: {
      erp_hrm_time_project_id: project.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (timelog !== null) {
    throw new HttpException(
      "Project cannot be deleted because timelogs exist.",
      400,
    );
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_projects.delete({
      where: {
        id: project.id,
      },
    });
  });
}
