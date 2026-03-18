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
  member: MemberPayload;
  body: IHrmPlatformProject.IRequest;
}): Promise<IPageIHrmPlatformProject.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const member = await MyGlobal.prisma.hrm_platform_members.findUnique({
    where: { id: props.member.id },
    include: {
      employees: {
        where: { deleted_at: null },
        include: {
          organization: true,
        },
      },
    },
  });
  if (!member || member.employees.length === 0) {
    throw new HttpException("Member not found", 404);
  }
  const organizationId = member.employees[0].hrm_platform_organization_id;
  const whereInput: Prisma.hrm_platform_projectsWhereInput = {
    hrm_platform_organization_id: organizationId,
    deleted_at: null,
  };
  if (props.body.search !== undefined && props.body.search !== "") {
    whereInput.OR = [
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
    ];
  }
  if (props.body.status !== undefined && props.body.status !== "") {
    whereInput.status = props.body.status;
  }
  if (props.body.start_date_from !== undefined) {
    whereInput.start_date = {
      gte: new Date(props.body.start_date_from),
    };
  }
  if (props.body.start_date_to !== undefined) {
    whereInput.start_date = Object.assign(whereInput.start_date || {}, {
      lte: new Date(props.body.start_date_to),
    });
  }
  if (props.body.end_date_from !== undefined) {
    whereInput.end_date = {
      gte: new Date(props.body.end_date_from),
    };
  }
  if (props.body.end_date_to !== undefined) {
    whereInput.end_date = Object.assign(whereInput.end_date || {}, {
      lte: new Date(props.body.end_date_to),
    });
  }
  if (props.body.budget_hours_min !== undefined) {
    whereInput.budget_hours = {
      gte: props.body.budget_hours_min,
    };
  }
  if (props.body.budget_hours_max !== undefined) {
    whereInput.budget_hours = Object.assign(whereInput.budget_hours || {}, {
      lte: props.body.budget_hours_max,
    });
  }
  const orderByInput: Prisma.hrm_platform_projectsOrderByWithRelationInput =
    props.body.sort_by !== undefined && props.body.sort_by !== ""
      ? props.body.sort_order === "asc"
        ? { [props.body.sort_by]: "asc" }
        : { [props.body.sort_by]: "desc" }
      : { created_at: "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_projects.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPlatformProjectAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_projects.count({ where: whereInput }),
  ]);
  const projects = await ArrayUtil.asyncMap(
    data,
    HrmPlatformProjectAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: projects,
  } satisfies IPageIHrmPlatformProject.ISummary;
}
