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
  // Validate project exists
  await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
    where: { id: props.projectId },
  });
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where condition
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
  } satisfies Prisma.hrm_platform_project_snapshotsWhereInput;
  // Build order by condition
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
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmPlatformProjectSnapshot.ISummary;
}
