import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmAdminProjectsProjectId(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the project exists
  await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true },
  });
  // Check for timelogs associated with this project
  const timelogCount = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: { erp_hrm_project_id: props.projectId },
  });
  // If timelogs exist, reject deletion to preserve historical time tracking data
  if (timelogCount > 0) {
    throw new HttpException(
      "Cannot delete project. Time entries exist for this project. Please archive the project instead if you wish to prevent new entries.",
      409,
    );
  }
  // Perform cascade deletion within a transaction
  await MyGlobal.prisma.$transaction([
    // Delete all tasks associated with the project
    MyGlobal.prisma.erp_hrm_tasks.deleteMany({
      where: { erp_hrm_project_id: props.projectId },
    }),
    // Delete all project member assignments
    MyGlobal.prisma.erp_hrm_project_members.deleteMany({
      where: { erp_hrm_project_id: props.projectId },
    }),
    // Delete the project itself
    MyGlobal.prisma.erp_hrm_projects.delete({
      where: { id: props.projectId },
    }),
  ]);
}
