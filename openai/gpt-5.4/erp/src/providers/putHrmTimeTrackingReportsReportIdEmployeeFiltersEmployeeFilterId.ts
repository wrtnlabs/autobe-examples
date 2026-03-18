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

export async function putHrmTimeTrackingReportsReportIdEmployeeFiltersEmployeeFilterId(props: {
  reportId: string & tags.Format<"uuid">;
  employeeFilterId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingReportEmployeeFilter.IUpdate;
}): Promise<IHrmTimeTrackingReportEmployeeFilter> {
  const report =
    await MyGlobal.prisma.hrm_time_tracking_reports.findFirstOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  await MyGlobal.prisma.hrm_time_tracking_report_employee_filters.findFirstOrThrow(
    {
      where: {
        id: props.employeeFilterId,
        hrm_time_tracking_report_id: report.id,
      },
      select: {
        id: true,
      },
    },
  );
  await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
    where: {
      id: props.body.hrm_time_tracking_employee_id,
    },
    select: {
      id: true,
    },
  });
  const duplicated =
    await MyGlobal.prisma.hrm_time_tracking_report_employee_filters.findFirst({
      where: {
        hrm_time_tracking_report_id: report.id,
        hrm_time_tracking_employee_id: props.body.hrm_time_tracking_employee_id,
        id: {
          not: props.employeeFilterId,
        },
      },
      select: {
        id: true,
      },
    });
  if (duplicated !== null) {
    throw new HttpException("Duplicate employee filter selection", 400);
  }
  await MyGlobal.prisma.hrm_time_tracking_report_employee_filters.update({
    where: {
      id: props.employeeFilterId,
    },
    data: {
      employee: {
        connect: {
          id: props.body.hrm_time_tracking_employee_id,
        },
      },
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_report_employee_filters.findUniqueOrThrow(
      {
        where: {
          id: props.employeeFilterId,
        },
        ...HrmTimeTrackingReportEmployeeFilterTransformer.select(),
      },
    );
  return await HrmTimeTrackingReportEmployeeFilterTransformer.transform(
    updated,
  );
}
