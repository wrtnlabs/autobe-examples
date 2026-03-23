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
import { HrmPlatformProjectAtSummaryTransformer } from "../transformers/HrmPlatformProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjects(props: {
  member: MemberPayload;
  body: IHrmPlatformProject.IRequest;
}): Promise<IPageIHrmPlatformProject.ISummary> {
  // Get the member's organization from their employee record
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const organizationId = employee.organization_id;
  // Parse pagination parameters
  const page = props.body.page ?? props.body.limit ?? 1;
  const limit = props.body.page_size ?? props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput = {
    organization_id: organizationId,
    deleted_at: null,
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.search && {
      name: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.hrm_platform_projectsWhereInput;
  // Build orderBy clause
  const sortField = props.body.sort ?? "created_at";
  const orderDirection = (props.body.order ?? "DESC").toUpperCase() as
    | "asc"
    | "desc";
  const orderByInput = {
    [sortField]: orderDirection,
  } satisfies Prisma.hrm_platform_projectsOrderByWithRelationInput;
  // Query projects
  const data = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformProjectAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.hrm_platform_projects.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
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
    data: transformedData,
  };
}
