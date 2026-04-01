import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";

export namespace HrmPlatformTaskHistoryAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_task_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        changed_at: true,
        old_status: true,
        new_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        task: { select: { id: true } },
        member: HrmPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_task_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTaskHistory.ISummary> {
    return {
      id: input.id,
      changed_at: input.changed_at.toISOString(),
      old_status: input.old_status,
      new_status: input.new_status,
      member: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
    };
  }
}
