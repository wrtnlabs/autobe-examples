import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformTimesheetSnapshotAtSummaryTransformer } from "../transformers/HrmPlatformTimesheetSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformAdminTimesheetSnapshots(props: {
  admin: AdminPayload;
  body: IHrmPlatformTimesheetSnapshot.IRequest;
}): Promise<IPageIHrmPlatformTimesheetSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_timesheet_snapshotsWhereInput = {
    deleted_at: null,
    ...(props.body.employee_id !== undefined && {
      hrm_platform_employee_id: props.body.employee_id,
    }),
    ...(props.body.approver_id !== undefined && {
      approver_id: props.body.approver_id,
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.week_start_date_from !== undefined && {
      week_start_date: {
        gte: new Date(props.body.week_start_date_from),
      },
    }),
    ...(props.body.week_start_date_to !== undefined && {
      week_start_date: {
        lte: new Date(props.body.week_start_date_to),
      },
    }),
    ...(props.body.submitted_at_from !== undefined &&
      props.body.submitted_at_from !== null && {
        submitted_at: {
          gte: new Date(props.body.submitted_at_from),
        },
      }),
    ...(props.body.submitted_at_to !== undefined &&
      props.body.submitted_at_to !== null && {
        submitted_at: {
          lte: new Date(props.body.submitted_at_to),
        },
      }),
    ...(props.body.approved_at_from !== undefined &&
      props.body.approved_at_from !== null && {
        approved_at: {
          gte: new Date(props.body.approved_at_from),
        },
      }),
    ...(props.body.approved_at_to !== undefined &&
      props.body.approved_at_to !== null && {
        approved_at: {
          lte: new Date(props.body.approved_at_to),
        },
      }),
    ...(props.body.rejected_at_from !== undefined &&
      props.body.rejected_at_from !== null && {
        rejected_at: {
          gte: new Date(props.body.rejected_at_from),
        },
      }),
    ...(props.body.rejected_at_to !== undefined &&
      props.body.rejected_at_to !== null && {
        rejected_at: {
          lte: new Date(props.body.rejected_at_to),
        },
      }),
  };
  const data = await MyGlobal.prisma.hrm_platform_timesheet_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmPlatformTimesheetSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_timesheet_snapshots.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformTimesheetSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
