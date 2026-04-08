import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackProjectMemberCollector } from "../collectors/HrmTimeTrackProjectMemberCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackProjectMemberTransformer } from "../transformers/HrmTimeTrackProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackProjectMember.ICreate;
}): Promise<IHrmTimeTrackProjectMember> {
  // Validate project exists and get organization context
  const project =
    await MyGlobal.prisma.hrm_time_track_projects.findUniqueOrThrow({
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_track_organization_id: true,
      },
    });
  // Validate employee exists and belongs to same organization
  const employee =
    await MyGlobal.prisma.hrm_time_track_employees.findUniqueOrThrow({
      where: {
        id: props.body.employee_id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_track_organization_id: true,
      },
    });
  // Check organization match
  if (
    employee.hrm_time_track_organization_id !==
    project.hrm_time_track_organization_id
  ) {
    throw new HttpException(
      "Employee does not belong to the same organization as the project",
      403,
    );
  }
  // Check for existing membership
  const existingMembership =
    await MyGlobal.prisma.hrm_time_track_project_members.findFirst({
      where: {
        hrm_time_track_employee_id: props.body.employee_id,
        hrm_time_track_project_id: props.projectId,
        deleted_at: null,
      },
    });
  if (existingMembership !== null) {
    throw new HttpException(
      "Employee is already assigned to this project",
      409,
    );
  }
  // Create project member using collector and transformer
  const record = await MyGlobal.prisma.hrm_time_track_project_members.create({
    data: await HrmTimeTrackProjectMemberCollector.collect({
      body: props.body,
      hrmTimeTrackProjects: {
        id: project.id,
      },
    }),
    ...HrmTimeTrackProjectMemberTransformer.select(),
  });
  return await HrmTimeTrackProjectMemberTransformer.transform(record);
}
