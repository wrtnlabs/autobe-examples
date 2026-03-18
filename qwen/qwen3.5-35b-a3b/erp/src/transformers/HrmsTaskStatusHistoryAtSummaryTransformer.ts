import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskStatusHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmsMemberAtSummaryTransformer } from "./HrmsMemberAtSummaryTransformer";

export namespace HrmsTaskStatusHistoryAtSummaryTransformer {
  export type Payload = Prisma.hrms_task_status_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        old_status: true,
        new_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: HrmsMemberAtSummaryTransformer.select(),
        task: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrms_tasksFindManyArgs,
      },
    } satisfies Prisma.hrms_task_status_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsTaskStatusHistory.ISummary> {
    return {
      id: input.id,
      old_status: input.old_status,
      new_status: input.new_status,
      member: await HrmsMemberAtSummaryTransformer.transform(input.member),
      task: {
        project_id: input.task.id,
        project_name: "",
        task_count: 0,
      } satisfies IHrmsTask.ISummary,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: toISOStringSafe(input.deleted_at ?? new Date()),
    };
  }
}
