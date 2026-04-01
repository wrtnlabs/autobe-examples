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
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUnique({
      where: { id: props.organizationId },
    });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // Find employee record for this member in this organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Check if member has org:manage permission through their role
  const role = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      id: employee.hrm_platform_role_id,
      hrm_platform_organization_id: props.organizationId,
    },
    select: {
      permissions: {
        select: {
          permission: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  if (
    role === null ||
    !role.permissions.some((rp) => rp.permission.name === "org:manage")
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause
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
  // Build order by
  const orderByInput: Prisma.hrm_platform_organization_snapshotsOrderByWithRelationInput =
    props.body.sort_by
      ? {
          [props.body.sort_by]:
            props.body.sort_order === "asc" ? "asc" : "desc",
        }
      : { created_at: "desc" };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query snapshots
  const snapshots =
    await MyGlobal.prisma.hrm_platform_organization_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPlatformOrganizationSnapshotAtSummaryTransformer.select(),
    });
  // Count total
  const total = await MyGlobal.prisma.hrm_platform_organization_snapshots.count(
    {
      where: whereInput,
    },
  );
  // Transform results
  const data = await ArrayUtil.asyncMap(
    snapshots,
    HrmPlatformOrganizationSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
