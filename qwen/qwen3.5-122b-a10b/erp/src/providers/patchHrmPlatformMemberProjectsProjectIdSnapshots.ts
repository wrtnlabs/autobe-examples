import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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
  // Verify project exists
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: { id: true, hrm_platform_organization_id: true },
    },
  );
  // Find the employee for this member (use user_id, not member_id)
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify member has access to this project (via project membership)
  const membership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: employee.id,
      },
    });
  if (!membership) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where conditions
  const whereInput: Prisma.hrm_platform_project_snapshotsWhereInput = {
    hrm_platform_project_id: props.projectId,
    ...(props.body.fromDate && {
      created_at: {
        gte: new Date(props.body.fromDate),
      },
    }),
    ...(props.body.toDate && {
      created_at: {
        lte: new Date(props.body.toDate),
      },
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
  };
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build order by
  const orderByInput: Prisma.hrm_platform_project_snapshotsOrderByWithRelationInput =
    props.body.sort === "status"
      ? { status: props.body.order ?? "desc" }
      : { created_at: props.body.order ?? "desc" };
  // Query snapshots
  const snapshots =
    await MyGlobal.prisma.hrm_platform_project_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPlatformProjectSnapshotAtSummaryTransformer.select(),
    });
  // Count total
  const total = await MyGlobal.prisma.hrm_platform_project_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    snapshots,
    HrmPlatformProjectSnapshotAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformProjectSnapshot.ISummary;
}
