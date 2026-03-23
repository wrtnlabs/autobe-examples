import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformProjectAtSummaryTransformer } from "./HrmPlatformProjectAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "./HrmPlatformTaskAtSummaryTransformer";

export namespace HrmPlatformTaskSnapshotTransformer {
  export type Payload = Prisma.hrm_platform_task_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        due_date: true,
        estimated_hours: true,
        task_created_at: true,
        updated_at: true,
        deleted_at: true,
        snapshot_created_at: true,
        task: true,
        project: HrmPlatformProjectAtSummaryTransformer.select(),
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        parentTask: HrmPlatformTaskAtSummaryTransformer.select(),
        creatorSession: true,
      },
    } satisfies Prisma.hrm_platform_task_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTaskSnapshot> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      due_date: input.due_date?.toISOString() ?? null,
      estimated_hours: input.estimated_hours ?? null,
      task_created_at: input.task_created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      snapshot_created_at: input.snapshot_created_at.toISOString(),
      project: await HrmPlatformProjectAtSummaryTransformer.transform(
        input.project,
      ),
      employee: input.employee
        ? await HrmPlatformEmployeeAtSummaryTransformer.transform(
            input.employee,
          )
        : null,
      parentTask: input.parentTask
        ? await HrmPlatformTaskAtSummaryTransformer.transform(input.parentTask)
        : null,
    };
  }
}
