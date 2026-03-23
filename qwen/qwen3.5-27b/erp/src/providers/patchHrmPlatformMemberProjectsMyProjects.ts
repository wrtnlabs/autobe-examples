import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
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

export async function patchHrmPlatformMemberProjectsMyProjects(props: {
  member: MemberPayload;
  body: IHrmPlatformProject.IRequest;
}): Promise<IPageIHrmPlatformProject.ISummary> {
  // Find the employee record for this member in their current organization
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { hrm_platform_organization_id: true },
    });
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        organization_id: session.hrm_platform_organization_id ?? undefined,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Extract pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.page_size ?? props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Extract sort parameters with proper defaults
  const sortField = (
    props.body.sort !== undefined &&
    ["name", "status", "created_at"].includes(props.body.sort)
      ? props.body.sort
      : "changed_at"
  ) as "name" | "status" | "created_at";
  const sortOrder = (props.body.order ?? "DESC").toLowerCase() as
    | "asc"
    | "desc";
  // Build where clause
  const whereInput = {
    deleted_at: null,
    memberships: {
      some: {
        hrm_platform_employee_id: employee.id,
        deleted_at: null,
      },
    },
    ...(props.body.search != null &&
      props.body.search !== "" && {
        name: {
          contains: props.body.search,
        },
      }),
    ...(props.body.status != null &&
      props.body.status !== "" && {
        status: props.body.status,
      }),
  } satisfies Prisma.hrm_platform_projectsWhereInput;
  // Query projects with pagination and sorting
  const data = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { [sortField]: sortOrder },
    select: {
      id: true,
      name: true,
      status: true,
      color_code: true,
      budget_hours: true,
      created_at: true,
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.hrm_platform_projects.count({
    where: whereInput,
  });
  // Transform to ISummary format
  const transformedData = data.map(
    (project) =>
      ({
        id: project.id,
        name: project.name,
        status: project.status,
        color_code: project.color_code,
        budget_hours: project.budget_hours,
        created_at: project.created_at.toISOString(),
      }) satisfies IHrmPlatformProject.ISummary,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIHrmPlatformProject.ISummary;
}
