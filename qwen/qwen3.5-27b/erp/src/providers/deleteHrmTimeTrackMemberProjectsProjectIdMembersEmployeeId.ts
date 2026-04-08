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

export async function deleteHrmTimeTrackMemberProjectsProjectIdMembersEmployeeId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  employeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // TODO: Verify member has project management permission
  // throw new HttpException("Forbidden", 403) if not authorized
  // Find the membership record
  const membership =
    await MyGlobal.prisma.hrm_time_track_project_members.findFirst({
      where: {
        hrm_time_track_employee_id: props.employeeId,
        hrm_time_track_project_id: props.projectId,
        deleted_at: null,
      },
    });
  if (membership === null) {
    throw new HttpException("Project membership not found", 404);
  }
  // Soft delete the membership
  await MyGlobal.prisma.hrm_time_track_project_members.update({
    where: { id: membership.id },
    data: { deleted_at: new Date() },
  });
}
