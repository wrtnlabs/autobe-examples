import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmProjectMemberAtSummaryTransformer } from "./ErpHrmProjectMemberAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";

export namespace ErpHrmTimerTransformer {
  export type Payload = Prisma.erp_hrm_timersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        started_at: true,
        description: true,
        created_at: true,
        updated_at: true,
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        project: ErpHrmProjectMemberAtSummaryTransformer.select(),
        task: ErpHrmTaskAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_timersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTimer> {
    return {
      id: input.id,
      started_at: input.started_at.toISOString(),
      description: input.description ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await ErpHrmProjectMemberAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await ErpHrmTaskAtSummaryTransformer.transform(input.task)
        : undefined,
      elapsed_time_ms: Date.now() - new Date(input.started_at).getTime(),
    };
  }
}
