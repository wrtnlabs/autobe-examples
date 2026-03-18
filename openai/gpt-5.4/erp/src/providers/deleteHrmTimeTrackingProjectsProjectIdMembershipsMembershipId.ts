import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingProjectsProjectIdMembershipsMembershipId(props: {
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
    },
    select: {
      id: true,
    },
  });
  const membership =
    await MyGlobal.prisma.hrm_time_tracking_project_memberships.findFirstOrThrow(
      {
        where: {
          id: props.membershipId,
          hrm_time_tracking_project_id: props.projectId,
        },
        select: {
          id: true,
          membership_role: true,
          deleted_at: true,
        },
      },
    );
  if (membership.deleted_at !== null) {
    throw new HttpException("Project membership is no longer active.", 409);
  }
  await MyGlobal.prisma.hrm_time_tracking_project_memberships.update({
    where: {
      id: membership.id,
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
