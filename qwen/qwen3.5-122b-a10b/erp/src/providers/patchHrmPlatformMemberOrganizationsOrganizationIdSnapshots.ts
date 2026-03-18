import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationSnapshotAtSummaryTransformer } from "../transformers/HrmPlatformOrganizationSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberOrganizationsOrganizationIdSnapshots(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganizationSnapshot.IRequest;
}): Promise<IPageIHrmPlatformOrganizationSnapshot.ISummary> {
  // Validate organization exists
  await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
  });
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with date range filtering
  const whereInput: Prisma.hrm_platform_organization_snapshotsWhereInput = {
    hrm_platform_organization_id: props.organizationId,
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  };
  // Build order by clause
  const orderByInput: Prisma.hrm_platform_organization_snapshotsOrderByWithRelationInput =
    props.body.sort_by && props.body.sort_order
      ? {
          [props.body.sort_by]: props.body.sort_order as "asc" | "desc",
        }
      : { created_at: "desc" };
  // Fetch paginated data
  const data =
    await MyGlobal.prisma.hrm_platform_organization_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPlatformOrganizationSnapshotAtSummaryTransformer.select(),
    });
  // Count total records
  const total = await MyGlobal.prisma.hrm_platform_organization_snapshots.count(
    {
      where: whereInput,
    },
  );
  // Transform and return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformOrganizationSnapshotAtSummaryTransformer.transform,
    ),
  };
}
