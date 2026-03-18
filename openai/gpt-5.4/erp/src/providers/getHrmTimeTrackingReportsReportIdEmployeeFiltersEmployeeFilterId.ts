import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingReportEmployeeFilterTransformer } from "../transformers/HrmTimeTrackingReportEmployeeFilterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingReportsReportIdEmployeeFiltersEmployeeFilterId(props: {
  reportId: string & tags.Format<"uuid">;
  employeeFilterId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingReportEmployeeFilter> {
  await MyGlobal.prisma.hrm_time_tracking_reports.findFirstOrThrow({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const employeeFilter =
    await MyGlobal.prisma.hrm_time_tracking_report_employee_filters.findFirstOrThrow(
      {
        where: {
          id: props.employeeFilterId,
          hrm_time_tracking_report_id: props.reportId,
        },
        ...HrmTimeTrackingReportEmployeeFilterTransformer.select(),
      },
    );
  return await HrmTimeTrackingReportEmployeeFilterTransformer.transform(
    employeeFilter,
  );
}
