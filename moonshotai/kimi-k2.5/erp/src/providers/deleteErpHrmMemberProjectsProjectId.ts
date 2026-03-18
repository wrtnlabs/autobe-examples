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

export async function deleteErpHrmMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify project exists
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
  });
  // Check if project has any timelogs
  const timelogCount = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: { project_id: props.projectId },
  });
  if (timelogCount > 0) {
    throw new HttpException(
      "Cannot delete project with associated timelogs. Remove or reassign timelogs first.",
      400,
    );
  }
  // Delete project - cascade handles tasks and memberships
  await MyGlobal.prisma.erp_hrm_projects.delete({
    where: { id: props.projectId },
  });
}
