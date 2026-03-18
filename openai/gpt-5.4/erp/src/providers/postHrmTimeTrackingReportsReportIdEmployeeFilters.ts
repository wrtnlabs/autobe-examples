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
import { HrmTimeTrackingReportEmployeeFilterCollector } from "../collectors/HrmTimeTrackingReportEmployeeFilterCollector";
import { HrmTimeTrackingReportEmployeeFilterTransformer } from "../transformers/HrmTimeTrackingReportEmployeeFilterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingReportsReportIdEmployeeFilters(props: {
  reportId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingReportEmployeeFilter.ICreate;
}): Promise<IHrmTimeTrackingReportEmployeeFilter> {
  const report =
    await MyGlobal.prisma.hrm_time_tracking_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
      },
      select: {
        id: true,
      },
    });
  await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
    where: {
      id: props.body.hrm_time_tracking_employee_id,
    },
    select: {
      id: true,
    },
  });
  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      const existing =
        await tx.hrm_time_tracking_report_employee_filters.findUnique({
          where: {
            hrm_time_tracking_report_id_hrm_time_tracking_employee_id: {
              hrm_time_tracking_report_id: report.id,
              hrm_time_tracking_employee_id:
                props.body.hrm_time_tracking_employee_id,
            },
          },
          select: {
            id: true,
          },
        });
      if (existing !== null) {
        throw new HttpException("Employee filter already exists.", 409);
      }
      return await tx.hrm_time_tracking_report_employee_filters.create({
        data: await HrmTimeTrackingReportEmployeeFilterCollector.collect({
          body: props.body,
          report,
        }),
        ...HrmTimeTrackingReportEmployeeFilterTransformer.select(),
      });
    });
    return await HrmTimeTrackingReportEmployeeFilterTransformer.transform(
      created,
    );
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Employee filter already exists.", 409);
    }
    throw error;
  }
}
