import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackProjectTransformer } from "../transformers/HrmTimeTrackProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackProject.IUpdate;
}): Promise<IHrmTimeTrackProject> {
  // Find the project and verify it exists
  const project =
    await MyGlobal.prisma.hrm_time_track_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: { id: true, hrm_time_track_organization_id: true },
    });
  // Get the member's session to verify organization ownership
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { hrm_time_track_organization_id: true },
    });
  // Verify the project belongs to the member's organization
  if (
    project.hrm_time_track_organization_id !==
    session.hrm_time_track_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Build update data with only provided fields
  const updateData: Prisma.hrm_time_track_projectsUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.color_code !== undefined && {
      color_code: props.body.color_code,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.budget_hours !== undefined && {
      budget_hours: props.body.budget_hours,
    }),
    ...(props.body.start_date !== undefined && {
      start_date: props.body.start_date
        ? new Date(props.body.start_date)
        : null,
    }),
    ...(props.body.end_date !== undefined && {
      end_date: props.body.end_date ? new Date(props.body.end_date) : null,
    }),
    updated_at: new Date(),
  };
  // Update the project
  await MyGlobal.prisma.hrm_time_track_projects.update({
    where: { id: props.projectId },
    data: updateData,
  });
  // Fetch the updated project with full relations
  const updated =
    await MyGlobal.prisma.hrm_time_track_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      ...HrmTimeTrackProjectTransformer.select(),
    });
  // Transform and return
  return await HrmTimeTrackProjectTransformer.transform(updated);
}
