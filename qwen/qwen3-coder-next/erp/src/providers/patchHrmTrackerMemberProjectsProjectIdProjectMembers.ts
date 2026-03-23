import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerProjectMember";
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

export async function patchHrmTrackerMemberProjectsProjectIdProjectMembers(props: {
  member: MemberPayload;
  projectId: string;
  body: IHrmTrackerProjectMember.IRequest;
}): Promise<IPageIHrmTrackerProjectMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_tracker_project_membersWhereInput = {
    hrm_tracker_project_id: props.projectId,
    deleted_at: null,
  };
  if (props.body.role !== undefined) {
    where.role = props.body.role;
  }
  if (
    props.body.createdAtGte !== undefined ||
    props.body.createdAtLt !== undefined
  ) {
    where.created_at = {};
    if (props.body.createdAtGte !== undefined) {
      where.created_at.gte = new Date(props.body.createdAtGte);
    }
    if (props.body.createdAtLt !== undefined) {
      where.created_at.lt = new Date(props.body.createdAtLt);
    }
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrm_tracker_project_members.findMany({
      where,
      skip,
      take: limit,
      orderBy: (() => {
        if (props.body.sort === undefined) {
          return { created_at: "desc" };
        }
        const sorts: Prisma.hrm_tracker_project_membersOrderByWithRelationInput[] =
          [];
        props.body.sort.split(",").forEach((s) => {
          if (s === "role") {
            sorts.push({ role: "asc" });
          } else if (s === "createdAt") {
            sorts.push({ created_at: "asc" });
          } else if (s === "createdAt,desc") {
            sorts.push({ created_at: "desc" });
          }
        });
        return sorts.length > 0 ? sorts : { created_at: "desc" };
      })(),
      select: {
        id: true,
        role: true,
        created_at: true,
        updated_at: true,
        employee: {
          select: {
            id: true,
            status: true,
            position: true,
            created_at: true,
            user: {
              select: {
                id: true,
                display_name: true,
                avatar_url: true,
                phone: true,
                status: true,
                email_verified: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            status: true,
            start_date: true,
            end_date: true,
            created_at: true,
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
          },
        },
      },
    }),
    MyGlobal.prisma.hrm_tracker_project_members.count({ where }),
  ]);
  const transformData = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    role: item.role,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    employee: {
      id: item.employee.id as string & tags.Format<"uuid">,
      status: item.employee.status,
      position: item.employee.position ?? null,
      created_at: toISOStringSafe(item.employee.created_at),
      user: {
        id: item.employee.user.id as string & tags.Format<"uuid">,
        display_name: item.employee.user.display_name,
        avatar_url: item.employee.user.avatar_url ?? null,
        phone: item.employee.user.phone ?? null,
        status: item.employee.user.status as "active" | "deactivated",
        email_verified: item.employee.user.email_verified,
      },
    },
    project: {
      id: item.project.id as string & tags.Format<"uuid">,
      name: item.project.name,
      color: item.project.color,
      status: item.project.status,
      start_date: item.project.start_date
        ? toISOStringSafe(item.project.start_date)
        : null,
      end_date: item.project.end_date
        ? toISOStringSafe(item.project.end_date)
        : null,
      created_at: toISOStringSafe(item.project.created_at),
      organization: item.project.organization
        ? typia.assert<IHrmTrackerOrganization.ISummary>({
            id: item.project.organization.id as string & tags.Format<"uuid">,
            name: item.project.organization.name,
            description: item.project.organization.description ?? null,
            logo_image_uri: item.project.organization.logo_image_uri ?? null,
            status: item.project.organization.status as
              | "active"
              | "archived"
              | "deleted",
            created_at: toISOStringSafe(item.project.organization.created_at),
          })
        : null,
    },
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformData,
  } satisfies IPageIHrmTrackerProjectMember.ISummary;
}
