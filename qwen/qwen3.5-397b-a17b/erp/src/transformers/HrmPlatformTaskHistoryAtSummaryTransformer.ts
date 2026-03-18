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
        old_status: true,
        new_status: true,
        created_at: true,
        user: HrmPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_task_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTaskHistory.ISummary> {
    return {
      id: input.id,
      old_status:
        input.old_status !== null
          ? typia.assert<"completed" | "open" | "in-progress" | "closed">(
              input.old_status,
            )
          : null,
      new_status: typia.assert<"completed" | "open" | "in-progress" | "closed">(
        input.new_status,
      ),
      created_at: toISOStringSafe(input.created_at),
      user: await HrmPlatformMemberAtSummaryTransformer.transform(input.user),
    };
  }
}
