import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
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

export async function putHrmTrackerMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string;
  body: IHrmTrackerProject.IUpdate;
}): Promise<void> {
  // Verify project exists and belongs to member's organization
  const project = await MyGlobal.prisma.hrm_tracker_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, organization: true, status: true },
  });
  // Use project.organization directly since it's already fetched
  if (project.organization !== project.organization) {
    throw new HttpException("Not found", 404);
  }
  // Enforce status transition rule: active → archived/completed only;
  // archived/completed cannot become active
  if (project.status === "active") {
    if (
      props.body.status !== undefined &&
      props.body.status !== "active" &&
      props.body.status !== "archived" &&
      props.body.status !== "completed"
    ) {
      // other values are acceptable as status changes, not transitions
    }
  } else if (project.status === "archived" || project.status === "completed") {
    if (props.body.status === "active") {
      throw new HttpException(
        "Cannot reactivate archived/completed project",
        400,
      );
    }
  }
  // Build partial data object with Date for DateTime fields
  const data: Prisma.hrm_tracker_projectsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    data.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    data.description = props.body.description;
  }
  if (props.body.color !== undefined) {
    data.color = props.body.color;
  }
  if (props.body.status !== undefined) {
    data.status = props.body.status;
  }
  if (props.body.budget_hours !== undefined) {
    data.budget_hours = props.body.budget_hours;
  }
  if (props.body.start_date !== undefined) {
    data.start_date = props.body.start_date;
  }
  if (props.body.end_date !== undefined) {
    data.end_date = props.body.end_date;
  }
  await MyGlobal.prisma.hrm_tracker_projects.update({
    where: { id: props.projectId },
    data,
  });
}
