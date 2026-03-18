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

export async function deleteHrmTimeTrackingProjectsProjectId(props: {
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.hrm_time_tracking_projects.findUniqueOrThrow({
      where: {
        id: props.projectId,
      },
      select: {
        id: true,
      },
    });
    const timelog: {
      id: string;
    } | null = await prisma.hrm_time_tracking_timelogs.findFirst({
      where: {
        hrm_time_tracking_project_id: props.projectId,
      },
      select: {
        id: true,
      },
    });
    if (timelog !== null) {
      throw new HttpException(
        "Project cannot be deleted because time records are attached.",
        409,
      );
    }
    await prisma.hrm_time_tracking_projects.delete({
      where: {
        id: props.projectId,
      },
    });
  });
}
