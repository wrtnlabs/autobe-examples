import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerProject";
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

export async function patchHrmTrackerMemberProjects(props: {
  member: MemberPayload;
  body: IHrmTrackerProject.IRequest;
}): Promise<IPageIHrmTrackerProject.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const memberSession =
    await MyGlobal.prisma.hrm_tracker_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
        member_id: props.member.id,
      },
      select: { id: true },
    });
  const project = await MyGlobal.prisma.hrm_tracker_projects.findFirst({
    where: {
      deleted_at: null,
    },
    select: {
      hrm_tracker_organization_id: true,
    },
  });
  const memberOrganizationId = project?.hrm_tracker_organization_id;
  if (!memberOrganizationId) {
    throw new HttpException("No organization found", 404);
  }
  const where: Prisma.hrm_tracker_projectsWhereInput = {
    hrm_tracker_organization_id: memberOrganizationId,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.start_date && {
      start_date: { gte: new Date(props.body.start_date) },
    }),
    ...(props.body.end_date && {
      end_date: { lte: new Date(props.body.end_date) },
    }),
    ...(props.body.budget_hours_min !== undefined && {
      budget_hours: { gte: props.body.budget_hours_min },
    }),
    ...(props.body.budget_hours_max !== undefined && {
      budget_hours: { lte: props.body.budget_hours_max },
    }),
  } satisfies Prisma.hrm_tracker_projectsWhereInput;
  const data = await MyGlobal.prisma.hrm_tracker_projects.findMany({
    where,
    skip,
    take: limit,
    orderBy: buildOrderBy(props.body.sort_by, props.body.order),
    select: {
      id: true,
      name: true,
      color: true,
      status: true,
      start_date: true,
      end_date: true,
      organization: {
        select: {
          id: true,
          name: true,
          description: true,
          logo_image_uri: true,
          status: true,
          created_at: true,
        },
      },
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.hrm_tracker_projects.count({ where });
  const result = data.map((project) => ({
    id: project.id,
    name: project.name,
    color: project.color,
    status: project.status,
    start_date: project.start_date ? toISOStringSafe(project.start_date) : null,
    end_date: project.end_date ? toISOStringSafe(project.end_date) : null,
    organization: {
      id: project.organization.id,
      name: project.organization.name,
      description: project.organization.description,
      logo_image_uri: project.organization.logo_image_uri,
      status: typia.assert<"active" | "archived" | "deleted">(
        project.organization.status,
      ),
      created_at: toISOStringSafe(project.organization.created_at),
    },
    created_at: toISOStringSafe(project.created_at),
  }));
  return {
    data: result,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
function buildOrderBy(
  sortBy?: string,
  order?: "asc" | "desc",
): Prisma.hrm_tracker_projectsOrderByWithRelationInput {
  const validFields = ["id", "name", "status", "budget_hours"] as const;
  const field =
    sortBy && validFields.includes(sortBy as (typeof validFields)[number])
      ? (sortBy as (typeof validFields)[number])
      : "created_at";
  const dir = order === "asc" ? "asc" : "desc";
  return { [field]: dir };
}
