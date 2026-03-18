import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";

export namespace HrmPlatformActivityLogAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        created_at: true,
        member: HrmPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformActivityLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      target_entity_type: input.target_entity_type,
      target_entity_id: input.target_entity_id,
      member: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}
