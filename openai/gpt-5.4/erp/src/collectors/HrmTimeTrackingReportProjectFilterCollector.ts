import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingReportProjectFilterCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingReportProjectFilter.ICreate;
    report: IEntity;
  }) {
    const projectId: string | undefined = props.body.projectIds[0];
    if (projectId === undefined)
      throw new Error(
        "IHrmTimeTrackingReportProjectFilter.ICreate.projectIds must contain at least one project id.",
      );
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      report: {
        connect: {
          id: props.report.id,
        },
      },
      project: {
        connect: {
          id: projectId,
        },
      },
    } satisfies Prisma.hrm_time_tracking_report_project_filtersCreateInput;
  }
}
