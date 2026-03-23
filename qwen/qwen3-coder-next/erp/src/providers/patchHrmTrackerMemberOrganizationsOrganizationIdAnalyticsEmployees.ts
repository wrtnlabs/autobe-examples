import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerAnalytic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTrackerMemberOrganizationsOrganizationIdAnalyticsEmployees(props: {
  member: MemberPayload;
  organizationId: string;
  body: IHrmTrackerAnalytic.IEmployeeStatisticsRequest;
}): Promise<IPageIHrmTrackerAnalytic.IEmployeeStatistic> {
  // Get grouped statistics by status and employment_type
  const statistics = await MyGlobal.prisma.hrm_tracker_employees.groupBy({
    by: ["status", "employment_type"],
    where: {
      organization_id: props.organizationId,
      deleted_at: null,
    },
    _count: true,
  });
  // Get total counts for each status category
  const statusCounts = await MyGlobal.prisma.hrm_tracker_employees.groupBy({
    by: ["status"],
    where: {
      organization_id: props.organizationId,
      deleted_at: null,
    },
    _count: true,
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.hrm_tracker_employees.count({
    where: {
      organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  // Build complete statistics array
  const data: IHrmTrackerAnalytic.IEmployeeStatistic[] = statistics.map(
    (stat) => ({
      status: stat.status as string & tags.Format<"uuid">,
      employmentType: stat.employment_type as string & tags.Format<"uuid">,
      count: stat._count as number & tags.Type<"int32">,
    }),
  );
  // If no statistics found, return empty data with proper pagination
  if (data.length === 0) {
    return {
      pagination: {
        current: 1,
        limit: 0,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  return {
    pagination: {
      current: 1,
      limit: data.length,
      records: total,
      pages: 1,
    },
    data,
  };
}
