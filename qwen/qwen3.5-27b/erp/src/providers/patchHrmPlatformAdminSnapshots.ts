import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeSnapshot";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformEmployeeSnapshotAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformAdminSnapshots(props: {
  admin: AdminPayload;
  body: IHrmPlatformEmployeeSnapshot.IRequest;
}): Promise<IPageIHrmPlatformEmployeeSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_employee_snapshotsWhereInput = {};
  if (props.body.employment_type !== undefined) {
    whereInput.employment_type = props.body.employment_type;
  }
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (
    props.body.createdFrom !== undefined ||
    props.body.createdTo !== undefined
  ) {
    whereInput.created_at = {};
    if (props.body.createdFrom !== undefined) {
      whereInput.created_at.gte = new Date(props.body.createdFrom);
    }
    if (props.body.createdTo !== undefined) {
      whereInput.created_at.lte = new Date(props.body.createdTo);
    }
  }
  if (props.body.search !== undefined) {
    whereInput.OR = [
      { employment_type: { contains: props.body.search, mode: "insensitive" } },
      { status: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  const orderByInput: Prisma.hrm_platform_employee_snapshotsOrderByWithRelationInput =
    props.body.sortField === "created_at"
      ? { created_at: props.body.sortOrder ?? "desc" }
      : props.body.sortField === "employee_created_at"
        ? { employee_created_at: props.body.sortOrder ?? "desc" }
        : props.body.sortField === "employment_type"
          ? { employment_type: props.body.sortOrder ?? "desc" }
          : props.body.sortField === "status"
            ? { status: props.body.sortOrder ?? "desc" }
            : { created_at: "desc" };
  const data = await MyGlobal.prisma.hrm_platform_employee_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformEmployeeSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_employee_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformEmployeeSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
