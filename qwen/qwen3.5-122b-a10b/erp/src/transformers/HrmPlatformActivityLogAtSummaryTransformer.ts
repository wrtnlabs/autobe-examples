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
        target_entity: true,
        target_id: true,
        created_at: true,
        user: HrmPlatformMemberAtSummaryTransformer.select(),
        details: true,
        organization: {
          select: { id: true },
        } satisfies Prisma.hrm_platform_organizationsFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformActivityLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      target_entity: input.target_entity,
      target_id: input.target_id ?? null,
      user: await HrmPlatformMemberAtSummaryTransformer.transform(input.user),
      created_at: input.created_at.toISOString(),
    };
  }
}
