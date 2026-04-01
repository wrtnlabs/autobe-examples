import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartmentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentSnapshotAtSummaryTransformer } from "../transformers/HrmPlatformDepartmentSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberDepartmentsDepartmentIdSnapshots(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmPlatformDepartmentSnapshot.IRequest;
}): Promise<IPageIHrmPlatformDepartmentSnapshot.ISummary> {
  // Validate department exists
  await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
    where: { id: props.departmentId },
  });
  // Build where clause with filters
  const createdAtFilter: Prisma.DateTimeFilter | undefined = (() => {
    const conditions: Record<string, Date> = {};
    if (props.body.date_from !== undefined) {
      conditions.gte = new Date(props.body.date_from);
    }
    if (props.body.date_to !== undefined) {
      conditions.lte = new Date(props.body.date_to);
    }
    return Object.keys(conditions).length > 0 ? conditions : undefined;
  })();
  const whereInput: Prisma.hrm_platform_department_snapshotsWhereInput = {
    hrm_platform_department_id: props.departmentId,
    deleted_at: null,
    ...(props.body.parent_department_id !== undefined && {
      parent_department_id: props.body.parent_department_id,
    }),
    ...(props.body.name !== undefined && {
      name: {
        contains: props.body.name,
        mode: "insensitive",
      },
    }),
    ...(createdAtFilter !== undefined && {
      created_at: createdAtFilter,
    }),
  };
  // Pagination parameters
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // Query snapshots
  const snapshots =
    await MyGlobal.prisma.hrm_platform_department_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmPlatformDepartmentSnapshotAtSummaryTransformer.select(),
    });
  // Count total records
  const total: number =
    await MyGlobal.prisma.hrm_platform_department_snapshots.count({
      where: whereInput,
    });
  // Transform results
  const data: IHrmPlatformDepartmentSnapshot.ISummary[] =
    await ArrayUtil.asyncMap(
      snapshots,
      HrmPlatformDepartmentSnapshotAtSummaryTransformer.transform,
    );
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIHrmPlatformDepartmentSnapshot.ISummary;
}
