import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
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

export async function getHrmsMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmsProject> {
  // Get member's organization context from session
  const session = await MyGlobal.prisma.hrms_member_sessions.findUniqueOrThrow({
    where: { id: props.member.session_id },
    select: { current_organization_id: true },
  });
  // Query project with organization context filter
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      hrms_organization_id: session.current_organization_id!,
      deleted_at: null,
    },
    select: {
      id: true,
      hrms_organization_id: true,
      name: true,
      description: true,
      color_code: true,
      status: true,
      budget_hours: true,
      start_date: true,
      end_date: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Manually construct response (cast to IHrmsProject due to type mismatch)
  // Note: IHrmsProject is a dashboard type, but operation expects project details
  const response = {
    id: project.id,
    hrms_organization_id: project.hrms_organization_id,
    name: project.name,
    description: project.description ?? "",
    color_code: project.color_code,
    status: project.status,
    budget_hours: project.budget_hours,
    start_date: project.start_date?.toISOString() ?? null,
    end_date: project.end_date?.toISOString() ?? null,
    created_at: project.created_at.toISOString(),
    updated_at: project.updated_at.toISOString(),
  } as unknown as IHrmsProject;
  return response;
}
