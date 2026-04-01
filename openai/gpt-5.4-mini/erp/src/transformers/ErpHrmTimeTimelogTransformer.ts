import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeProjectAtSummaryTransformer } from "./ErpHrmTimeProjectAtSummaryTransformer";
import { ErpHrmTimeTaskAtSummaryTransformer } from "./ErpHrmTimeTaskAtSummaryTransformer";

export namespace ErpHrmTimeTimelogTransformer {
  export type Payload = Prisma.erp_hrm_time_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(input: Payload): Promise<IErpHrmTimeTimelog> {
    return {
      id: input.id,
      member: input.member as IErpHrmTimeMember.ISummary,
      project: await ErpHrmTimeProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await ErpHrmTimeTaskAtSummaryTransformer.transform(input.task)
        : null,
      work_date: input.work_date.toISOString(),
      duration_minutes: input.duration_minutes,
      description: input.description ?? null,
      billable: input.billable,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        work_date: true,
        duration_minutes: true,
        description: true,
        billable: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: true,
        project: ErpHrmTimeProjectAtSummaryTransformer.select(),
        task: ErpHrmTimeTaskAtSummaryTransformer.select(),
        timesheetTimelogs: true,
      },
    } satisfies Prisma.erp_hrm_time_timelogsFindManyArgs;
  }
}
