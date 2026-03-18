import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingReportProjectFilterTransformer } from "../transformers/HrmTimeTrackingReportProjectFilterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingReportsReportIdProjectFiltersProjectFilterId(props: {
  reportId: string & tags.Format<"uuid">;
  projectFilterId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingReportProjectFilter> {
  const projectFilter =
    await MyGlobal.prisma.hrm_time_tracking_report_project_filters.findFirstOrThrow(
      {
        where: {
          id: props.projectFilterId,
          hrm_time_tracking_report_id: props.reportId,
          deleted_at: null,
          report: {
            id: props.reportId,
            deleted_at: null,
          },
        },
        ...HrmTimeTrackingReportProjectFilterTransformer.select(),
      },
    );
  return await HrmTimeTrackingReportProjectFilterTransformer.transform(
    projectFilter,
  );
}
