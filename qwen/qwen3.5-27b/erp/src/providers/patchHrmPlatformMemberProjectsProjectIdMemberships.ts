import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectMembershipAtSummaryTransformer } from "../transformers/HrmPlatformProjectMembershipAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjectsProjectIdMemberships(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectMembership.IRequest;
}): Promise<IPageIHrmPlatformProjectMembership.ISummary> {
  // Validate project exists and is not soft-deleted
  await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
  });
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.hrm_platform_project_membershipsWhereInput = {
    hrm_platform_project_id: props.projectId,
    deleted_at: null,
    employee: {
      deleted_at: null,
    },
  } satisfies Prisma.hrm_platform_project_membershipsWhereInput;
  // Apply role filter if specified
  if (props.body.role !== undefined) {
    whereInput.role = props.body.role;
  }
  // Note: Search by employee name is not available - user_profile relation doesn't exist
  // Build ORDER BY clause - only role and created_at are available
  const orderByInput: Prisma.hrm_platform_project_membershipsOrderByWithRelationInput =
    props.body.sort === "role"
      ? {
          role: props.body.order ?? "desc",
        }
      : {
          created_at: props.body.order ?? "desc",
        };
  // Query memberships with pagination
  const data = await MyGlobal.prisma.hrm_platform_project_memberships.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformProjectMembershipAtSummaryTransformer.select(),
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.hrm_platform_project_memberships.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformProjectMembershipAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
