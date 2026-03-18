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

export async function patchHrmPlatformMemberDepartmentSnapshots(props: {
  member: MemberPayload;
  body: IHrmPlatformDepartmentSnapshot.IRequest;
}): Promise<IPageIHrmPlatformDepartmentSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      hrm_platform_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  const whereInput: Prisma.hrm_platform_department_snapshotsWhereInput = {
    deleted_at: null,
    department: {
      hrm_platform_organization_id: employee.hrm_platform_organization_id,
    },
    ...(props.body.department_id && {
      hrm_platform_department_id: props.body.department_id,
    }),
    ...(props.body.parent_department_id && {
      parent_department_id: props.body.parent_department_id,
    }),
    ...(props.body.name && {
      name: {
        contains: props.body.name,
        mode: "insensitive",
      },
    }),
    ...(props.body.date_from && {
      created_at: {
        gte: new Date(props.body.date_from),
      },
    }),
    ...(props.body.date_to && {
      created_at: {
        lte: new Date(props.body.date_to),
      },
    }),
  } satisfies Prisma.hrm_platform_department_snapshotsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_department_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...HrmPlatformDepartmentSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_department_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformDepartmentSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformDepartmentSnapshot.ISummary;
}
