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

export async function deleteHrmTimeTrackingMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const timelog = await MyGlobal.prisma.hrm_time_tracking_timelogs.findFirst({
    where: {
      project_id: project.id,
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
  await MyGlobal.prisma.hrm_time_tracking_projects.delete({
    where: {
      id: project.id,
    },
  });
}
