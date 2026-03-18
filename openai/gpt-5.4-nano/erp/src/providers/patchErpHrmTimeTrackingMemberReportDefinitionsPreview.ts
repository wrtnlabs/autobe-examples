import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
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

export async function patchErpHrmTimeTrackingMemberReportDefinitionsPreview(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingReportDefinition.IRequest;
}): Promise<IErpHrmTimeTrackingReportOutput.ISummary> {
  // Temporary implementation to be replaced by generator.
  return {
    id: v4() as any,
    report_generation_run_id: v4() as any,
    employee_id: v4() as any,
    project_id: v4() as any,
    task_id: null,
    week_start_date_id: null,
    grouping_sort_key: "",
    notes: null,
    created_at: toISOStringSafe(new Date() as any),
    updated_at: toISOStringSafe(new Date() as any),
    deleted_at: null,
  };
}
