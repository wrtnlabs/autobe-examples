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
import { HrmsProjectCollector } from "../collectors/HrmsProjectCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberOrganizationsOrganizationIdProjects(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsProject.ICreate;
}): Promise<IHrmsProject.ISummary> {
  const organization = await MyGlobal.prisma.hrms_organizations.findUnique({
    where: { id: props.organizationId },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  const memberRole = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      hrms_organization_id: props.organizationId,
    },
  });
  if (memberRole === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  const existingProject = await MyGlobal.prisma.hrms_projects.findFirst({
    where: {
      hrms_organization_id: props.organizationId,
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existingProject !== null) {
    throw new HttpException(
      "Project with this name already exists in organization",
      409,
    );
  }
  const collectorResult = await HrmsProjectCollector.collect({
    body: props.body,
    hrmsOrganizations: {
      id: props.organizationId,
    } as IEntity,
  });
  const created = await MyGlobal.prisma.hrms_projects.create({
    data: collectorResult,
  });
  return {
    id: created.id as string & tags.Format<"uuid">,
    name: created.name,
    description: created.description ?? "",
    color_code: created.color_code,
    organization_id: created.hrms_organization_id as string &
      tags.Format<"uuid">,
    organization_name: organization.name,
    status: created.status as "active" | "archived" | "completed",
    budget_hours: created.budget_hours,
    start_date: created.start_date?.toISOString() ?? null,
    end_date: created.end_date?.toISOString() ?? null,
    created_at: created.created_at.toISOString(),
    updated_at: created.updated_at.toISOString(),
    planned_hours: created.budget_hours ?? 0,
    actual_hours: 0,
    budget_utilization_percentage: null,
    total_tasks: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    closed_tasks: 0,
    timelog_count: 0,
  } satisfies IHrmsProject.ISummary;
}
