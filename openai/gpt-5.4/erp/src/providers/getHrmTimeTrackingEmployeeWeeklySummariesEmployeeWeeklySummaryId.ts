import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingEmployeeWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeWeeklySummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingEmployeeWeeklySummaryTransformer } from "../transformers/HrmTimeTrackingEmployeeWeeklySummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingEmployeeWeeklySummariesEmployeeWeeklySummaryId(props: {
  employee: EmployeePayload;
  employeeWeeklySummaryId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingEmployeeWeeklySummary> {
  const summary =
    await MyGlobal.prisma.hrm_time_tracking_employee_weekly_summaries.findFirstOrThrow(
      {
        where: {
          id: props.employeeWeeklySummaryId,
          hrm_time_tracking_employee_id: props.employee.id,
          deleted_at: null,
        },
        ...HrmTimeTrackingEmployeeWeeklySummaryTransformer.select(),
      },
    );
  return await HrmTimeTrackingEmployeeWeeklySummaryTransformer.transform(
    summary,
  );
}
