import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "./ErpHrmProjectAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";

export namespace ErpHrmTimerAtStopTransformer {
  export type Payload = Prisma.erp_hrm_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        start_time: true,
        end_time: true,
        duration_minutes: true,
        billable: true,
        description: true,
        created_at: true,
        updated_at: true,
        organizationMember:
          ErpHrmOrganizationMemberAtSummaryTransformer.select(),
        project: ErpHrmProjectAtSummaryTransformer.select(),
        task: ErpHrmTaskAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_timelogsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTimer.IStop> {
    return {
      id: input.id,
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
      task: input.task
        ? await ErpHrmTaskAtSummaryTransformer.transform(input.task)
        : null,
      organizationMember:
        await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
          input.organizationMember,
        ),
      startTime: input.start_time.toISOString(),
      endTime: input.end_time.toISOString(),
      durationMinutes: input.duration_minutes,
      description: input.description ?? undefined,
      billable: input.billable,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
