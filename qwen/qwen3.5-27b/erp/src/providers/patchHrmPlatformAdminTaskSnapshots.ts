import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformTaskSnapshotAtSummaryTransformer } from "../transformers/HrmPlatformTaskSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformAdminTaskSnapshots(props: {
  admin: AdminPayload;
  body: IHrmPlatformTaskSnapshot.IRequest;
}): Promise<IPageIHrmPlatformTaskSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.hrm_platform_task_snapshotsWhereInput = {};
  if (props.body.task_id !== undefined) {
    whereInput.hrm_platform_task_id = props.body.task_id;
  }
  if (props.body.project_id !== undefined) {
    whereInput.hrm_platform_project_id = props.body.project_id;
  }
  if (props.body.assigned_employee_id !== undefined) {
    whereInput.assigned_employee_id = props.body.assigned_employee_id;
  }
  if (
    props.body.snapshot_date_from !== undefined ||
    props.body.snapshot_date_to !== undefined
  ) {
    whereInput.snapshot_created_at = {};
    if (props.body.snapshot_date_from !== undefined) {
      whereInput.snapshot_created_at.gte = new Date(
        props.body.snapshot_date_from,
      );
    }
    if (props.body.snapshot_date_to !== undefined) {
      whereInput.snapshot_created_at.lte = new Date(
        props.body.snapshot_date_to,
      );
    }
  }
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.priority !== undefined) {
    whereInput.priority = props.body.priority;
  }
  // Build ORDER BY clause
  const orderByInput: Prisma.hrm_platform_task_snapshotsOrderByWithRelationInput =
    props.body.sort && props.body.order
      ? { [props.body.sort]: props.body.order }
      : { snapshot_created_at: "desc" };
  // Execute queries sequentially
  const data = await MyGlobal.prisma.hrm_platform_task_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformTaskSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_task_snapshots.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformTaskSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIHrmPlatformTaskSnapshot.ISummary;
}
