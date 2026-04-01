import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeSnapshot";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeSnapshotAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberEmployeeSnapshots(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployeeSnapshot.IRequest;
}): Promise<IPageIHrmPlatformEmployeeSnapshot.ISummary> {
  // Get member's organization context from their employee records
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
  // Validate date range if both provided
  if (props.body.created_at_from && props.body.created_at_to) {
    const from = new Date(props.body.created_at_from);
    const to = new Date(props.body.created_at_to);
    if (from > to) {
      throw new HttpException(
        "created_at_from must be before or equal to created_at_to",
        400,
      );
    }
  }
  // Build where clause
  const whereInput: Prisma.hrm_platform_employee_snapshotsWhereInput = {
    deleted_at: null,
    hrm_platform_organization_id: { in: organizationIds },
    ...(props.body.hrm_platform_employee_id && {
      hrm_platform_employee_id: props.body.hrm_platform_employee_id,
    }),
    ...(props.body.hrm_platform_user_id && {
      hrm_platform_user_id: props.body.hrm_platform_user_id,
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.employment_type && {
      employment_type: props.body.employment_type,
    }),
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
  // Determine pagination mode
  const useCursor =
    props.body.cursor !== undefined && props.body.cursor !== null;
  const usePage = props.body.page !== undefined && props.body.page !== null;
  const limit = props.body.limit ?? props.body.page_size ?? 100;
  const clampedLimit = Math.min(Math.max(limit, 1), 200);
  let data: HrmPlatformEmployeeSnapshotAtSummaryTransformer.Payload[];
  let total: number;
  if (useCursor && props.body.cursor) {
    // Cursor-based pagination
    const decoded = JSON.parse(
      Buffer.from(props.body.cursor, "base64").toString(),
    );
    const lastCreatedAt = new Date(decoded.created_at);
    const lastId = decoded.id as string;
    data = await MyGlobal.prisma.hrm_platform_employee_snapshots.findMany({
      where: {
        ...whereInput,
        AND: [
          {
            OR: [
              { created_at: { gt: lastCreatedAt } },
              { created_at: { equals: lastCreatedAt }, id: { gt: lastId } },
            ],
          },
        ],
      },
      orderBy: { created_at: "desc" },
      take: clampedLimit + 1,
      ...HrmPlatformEmployeeSnapshotAtSummaryTransformer.select(),
    } satisfies Prisma.hrm_platform_employee_snapshotsFindManyArgs);
    total = await MyGlobal.prisma.hrm_platform_employee_snapshots.count({
      where: whereInput,
    });
  } else if (usePage) {
    // Page-based pagination
    const page = Math.max(props.body.page ?? 1, 1);
    const skip = (page - 1) * clampedLimit;
    data = await MyGlobal.prisma.hrm_platform_employee_snapshots.findMany({
      where: whereInput,
      skip,
      take: clampedLimit,
      orderBy: { created_at: "desc" },
      ...HrmPlatformEmployeeSnapshotAtSummaryTransformer.select(),
    } satisfies Prisma.hrm_platform_employee_snapshotsFindManyArgs);
    total = await MyGlobal.prisma.hrm_platform_employee_snapshots.count({
      where: whereInput,
    });
  } else {
    // Default: page-based with page=1
    const page = 1;
    const skip = (page - 1) * clampedLimit;
    data = await MyGlobal.prisma.hrm_platform_employee_snapshots.findMany({
      where: whereInput,
      skip,
      take: clampedLimit,
      orderBy: { created_at: "desc" },
      ...HrmPlatformEmployeeSnapshotAtSummaryTransformer.select(),
    } satisfies Prisma.hrm_platform_employee_snapshotsFindManyArgs);
    total = await MyGlobal.prisma.hrm_platform_employee_snapshots.count({
      where: whereInput,
    });
  }
  const hasMore = data.length > clampedLimit;
  if (hasMore) {
    data = data.slice(0, clampedLimit);
  }
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformEmployeeSnapshotAtSummaryTransformer.transform,
  );
  const currentPage = usePage ? Math.max(props.body.page ?? 1, 1) : 1;
  const totalPages = Math.ceil(total / clampedLimit);
  let nextCursor: string | undefined;
  if (hasMore && data.length > 0) {
    const last = data[data.length - 1];
    nextCursor = Buffer.from(
      JSON.stringify({
        created_at: last.created_at.toISOString(),
        id: last.id,
      }),
    ).toString("base64");
  }
  return {
    data: transformedData,
    pagination: {
      current: currentPage,
      limit: clampedLimit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformEmployeeSnapshot.ISummary;
}
