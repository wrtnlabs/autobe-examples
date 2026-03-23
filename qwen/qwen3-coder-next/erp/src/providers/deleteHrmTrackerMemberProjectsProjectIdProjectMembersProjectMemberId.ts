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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteHrmTrackerMemberProjectsProjectIdProjectMembersProjectMemberId(props: {
  member: MemberPayload;
  projectId: string;
  projectMemberId: string;
}): Promise<void> {
  // Validate project member exists and belongs to project
  const projectMember =
    await MyGlobal.prisma.hrm_tracker_project_members.findFirstOrThrow({
      where: {
        id: props.projectMemberId,
        hrm_tracker_project_id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_tracker_employee_id: true,
      },
    });
  // Check for any existing timelogs for this project member (via project_id = projectId)
  // Rule: If any timelogs exist, reject with 409 Conflict
  const timelogExists = await MyGlobal.prisma.hrm_tracker_timelogs.findFirst({
    where: {
      project_id: props.projectId,
      employee_id: projectMember.hrm_tracker_employee_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (timelogExists) {
    throw new HttpException("Timelogs exist for this project member", 409);
  }
  // Perform soft-delete by setting deleted_at to current timestamp
  await MyGlobal.prisma.hrm_tracker_project_members.update({
    where: { id: props.projectMemberId },
    data: {
      deleted_at: new Date().toISOString() as string & tags.Format<"date-time">,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
}
