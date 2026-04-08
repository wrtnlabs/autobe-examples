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

export async function deleteErpHrmTimeMemberProjectsProjectIdMembershipsMembershipId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
}): Promise<void> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_project_memberships.findUniqueOrThrow({
      where: {
        id: props.membershipId,
      },
      select: {
        id: true,
        erp_hrm_time_project_id: true,
        project: {
          select: {
            id: true,
            erp_hrm_time_organization_id: true,
          },
        },
      },
    });
  if (membership.erp_hrm_time_project_id !== props.projectId) {
    throw new HttpException("Not Found", 404);
  }
  const organizationMembership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        erp_hrm_time_organization_id:
          membership.project.erp_hrm_time_organization_id,
        status: "active",
        deleted_at: null,
        is_selected_context: true,
      },
      select: {
        id: true,
      },
    });
  if (organizationMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.erp_hrm_time_project_memberships.delete({
    where: {
      id: props.membershipId,
    },
  });
}
