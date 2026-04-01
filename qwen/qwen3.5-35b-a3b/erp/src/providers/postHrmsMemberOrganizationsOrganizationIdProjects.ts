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

export async function postHrmsMemberOrganizationsOrganizationIdProjects(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsProject.ICreate;
}): Promise<IHrmsProject.ISummary> {
  // Verify organization exists and user belongs to it
  const organization =
    await MyGlobal.prisma.hrms_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
    });
  const orgMember =
    await MyGlobal.prisma.hrms_organization_members.findUniqueOrThrow({
      where: {
        hrms_organization_id_hrms_member_id: {
          hrms_organization_id: props.organizationId,
          hrms_member_id: props.member.id,
        },
      },
    });
  // Get role details for permission check
  const role = await MyGlobal.prisma.hrms_organization_roles.findUniqueOrThrow({
    where: { id: orgMember.hrms_organization_role_id },
  });
  // Validate project:manage permission (Owner or Manager)
  const hasPermission = [role.name === "Owner", role.name === "Manager"].some(
    Boolean,
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Check unique constraint: organizationId + name must be unique
  const existingProject = await MyGlobal.prisma.hrms_projects.findFirst({
    where: {
      hrms_organization_id: props.organizationId,
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existingProject !== null) {
    throw new HttpException("Project with this name already exists", 409);
  }
  // Create the project
  const created = await MyGlobal.prisma.hrms_projects.create({
    data: {
      id: v4(),
      hrms_organization_id: props.organizationId,
      name: props.body.name,
      description: props.body.description ?? null,
      color_code: props.body.color_code,
      status: "active",
      budget_hours: props.body.budget_hours ?? null,
      start_date: props.body.start_date
        ? new Date(props.body.start_date)
        : null,
      end_date: props.body.end_date ? new Date(props.body.end_date) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Construct response DTO matching IHrmsProject.ISummary structure
  return {
    id: created.id,
    name: created.name,
    description: created.description ?? "",
    color_code: created.color_code,
    organization_id: created.hrms_organization_id,
    organization_name: organization.name,
    status: created.status as "active" | "completed" | "archived",
    budget_hours: created.budget_hours,
    start_date: created.start_date ? toISOStringSafe(created.start_date) : null,
    end_date: created.end_date ? toISOStringSafe(created.end_date) : null,
    planned_hours: created.budget_hours ?? 0,
    actual_hours: 0,
    budget_utilization_percentage: null,
    total_tasks: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    closed_tasks: 0,
    timelog_count: 0,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  } satisfies IHrmsProject.ISummary;
}
