import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformProjectSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProjectSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectSnapshotAtSummaryTransformer } from "../transformers/HrmPlatformProjectSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjectsProjectIdSnapshots(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectSnapshot.IRequest;
}): Promise<IPageIHrmPlatformProjectSnapshot.ISummary> {
  // Verify project exists and get organization context
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      },
    },
  );
  // Verify member has access to the project's organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      organization_id: project.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause with optional filters
  const whereInput = {
    project_id: props.projectId,
    ...(props.body.from_date !== undefined && {
      created_at: {
        gte: new Date(props.body.from_date),
      },
    }),
    ...(props.body.to_date !== undefined && {
      created_at: {
        lte: new Date(props.body.to_date),
      },
    }),
    ...(props.body.created_by_id !== undefined && {
      created_by_id: props.body.created_by_id,
    }),
  } satisfies Prisma.hrm_platform_project_snapshotsWhereInput;
  // Build orderBy clause based on sort parameters
  const sortField = props.body.sort ?? "created_at";
  const orderDirection = props.body.order ?? "desc";
  const orderByInput = {
    ...(sortField === "created_at" && { created_at: orderDirection }),
    ...(sortField === "code" && { code: orderDirection }),
    ...(sortField === "name" && { name: orderDirection }),
    ...(sortField === "status" && { status: orderDirection }),
  } satisfies Prisma.hrm_platform_project_snapshotsOrderByWithRelationInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Fetch snapshots with pagination
  const data = await MyGlobal.prisma.hrm_platform_project_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformProjectSnapshotAtSummaryTransformer.select(),
  });
  // Count total records for pagination metadata
  const total = await MyGlobal.prisma.hrm_platform_project_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformProjectSnapshotAtSummaryTransformer.transform,
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
