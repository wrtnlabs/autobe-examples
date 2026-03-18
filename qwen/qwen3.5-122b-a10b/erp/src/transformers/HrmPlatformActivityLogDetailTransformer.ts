import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogDetail";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformActivityLogDetailTransformer {
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
        details: true,
        created_at: true,
        organization: true,
        user: true,
      },
    } satisfies Prisma.hrm_platform_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformActivityLogDetail> {
    const details = input.details ? JSON.parse(input.details) : {};
    return {
      old_value: details.old_value,
      new_value: details.new_value,
      old_status: details.old_status,
      new_status: details.new_status,
      reason: details.reason,
      changed_by: details.changed_by,
      action_date: details.action_date,
      metadata: details.metadata,
    };
  }
}
