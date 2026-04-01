import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
import { HrmPlatformProjectAtSummaryTransformer } from "../transformers/HrmPlatformProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjects(props: {
  member: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
  };
  body: IHrmPlatformProject.IRequest;
}): Promise<IPageIHrmPlatformProject.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const employees = await MyGlobal.prisma.hrm_platform_employees.findMany({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: { hrm_platform_organization_id: true },
  });
  if (employees.length === 0) {
    throw new HttpException("No organization context found", 403);
  }
  const organizationIds = employees.map((e) => e.hrm_platform_organization_id);
  const whereInput: Prisma.hrm_platform_projectsWhereInput = {
    deleted_at: null,
    hrm_platform_organization_id: {
      in: organizationIds,
    },
    ...(props.body.search && {
      OR: [
        {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      ],
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.start_date_from && {
      start_date: {
        gte: new Date(props.body.start_date_from),
      },
    }),
    ...(props.body.start_date_to && {
      start_date: {
        lte: new Date(props.body.start_date_to),
      },
    }),
    ...(props.body.end_date_from && {
      end_date: {
        gte: new Date(props.body.end_date_from),
      },
    }),
    ...(props.body.end_date_to && {
      end_date: {
        lte: new Date(props.body.end_date_to),
      },
    }),
    ...(props.body.budget_hours_min !== undefined && {
      budget_hours: {
        gte: props.body.budget_hours_min,
      },
    }),
    ...(props.body.budget_hours_max !== undefined && {
      budget_hours: {
        lte: props.body.budget_hours_max,
      },
    }),
  };
  const validSortColumns = [
    "name",
    "status",
    "created_at",
    "start_date",
    "end_date",
  ] as const;
  const sortColumn =
    props.body.sort_by &&
    validSortColumns.includes(
      props.body.sort_by as (typeof validSortColumns)[number],
    )
      ? props.body.sort_by
      : "created_at";
  const sortOrder = props.body.sort_order === "asc" ? "asc" : "desc";
  const orderByInput: Prisma.hrm_platform_projectsOrderByWithRelationInput = {
    [sortColumn]: sortOrder,
  };
  const projects = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformProjectAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_projects.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      projects,
      HrmPlatformProjectAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
