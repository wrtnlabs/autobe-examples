import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectMemberAtSummaryTransformer } from "../transformers/HrmPlatformProjectMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectMember.IRequest;
}): Promise<IPageIHrmPlatformProjectMember.ISummary> {
  // Verify project exists
  await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
    where: { id: props.projectId },
  });
  // Build where clause
  const whereInput: Prisma.hrm_platform_project_membersWhereInput = {
    hrm_platform_project_id: props.projectId,
    deleted_at: null,
  };
  // Apply role filter
  if (props.body.role !== undefined) {
    whereInput.role = props.body.role;
  }
  // Apply date range filters
  const createdAtFilter:
    | Prisma.DateTimeFilter<"hrm_platform_project_members">
    | undefined = (() => {
    const filter: Prisma.DateTimeFilter<"hrm_platform_project_members"> = {};
    if (props.body.created_at_from !== undefined) {
      filter.gte = new Date(props.body.created_at_from);
    }
    if (props.body.created_at_to !== undefined) {
      filter.lte = new Date(props.body.created_at_to);
    }
    return Object.keys(filter).length > 0 ? filter : undefined;
  })();
  if (createdAtFilter !== undefined) {
    whereInput.created_at = createdAtFilter;
  }
  // Apply search filter (employee name via member display_name)
  if (props.body.search !== undefined && props.body.search.trim().length > 0) {
    whereInput.employee = {
      user: {
        display_name: {
          contains: props.body.search,
        },
      },
    } satisfies Prisma.hrm_platform_employeesWhereInput;
  }
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query project members with proper select
  const data = await MyGlobal.prisma.hrm_platform_project_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...HrmPlatformProjectMemberAtSummaryTransformer.select(),
  } satisfies Prisma.hrm_platform_project_membersFindManyArgs);
  // Count total records
  const total = await MyGlobal.prisma.hrm_platform_project_members.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformProjectMemberAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformProjectMember.ISummary;
}
