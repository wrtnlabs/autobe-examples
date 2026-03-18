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

export namespace ErpHrmTimerTransformer {
  export type Payload = Prisma.erp_hrm_timersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        organizationMember:
          ErpHrmOrganizationMemberAtSummaryTransformer.select(),
        project: ErpHrmProjectAtSummaryTransformer.select(),
        task: ErpHrmTaskAtSummaryTransformer.select(),
        description: true,
        started_at: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.erp_hrm_timersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTimer> {
    const now = Date.now();
    const startedAt = input.started_at.getTime();
    const elapsedDuration = Math.floor((now - startedAt) / (60 * 1000));
    return {
      id: input.id,
      organizationMember:
        await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
          input.organizationMember,
        ),
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
      task: input.task
        ? await ErpHrmTaskAtSummaryTransformer.transform(input.task)
        : null,
      description: input.description,
      startedAt: input.started_at.toISOString(),
      elapsedDuration,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
