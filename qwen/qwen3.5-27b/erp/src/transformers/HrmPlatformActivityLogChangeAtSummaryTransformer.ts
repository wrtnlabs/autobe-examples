import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { IHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogChange";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformActivityLogAtSummaryTransformer } from "./HrmPlatformActivityLogAtSummaryTransformer";

export namespace HrmPlatformActivityLogChangeAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_activity_log_changesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        field_name: true,
        old_value: true,
        new_value: true,
        field_type: true,
        created_at: true,
        activityLog: HrmPlatformActivityLogAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_activity_log_changesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformActivityLogChange.ISummary> {
    return {
      id: input.id,
      field_name: input.field_name,
      old_value: input.old_value,
      new_value: input.new_value,
      field_type: input.field_type,
      created_at: input.created_at.toISOString(),
      activityLog: await HrmPlatformActivityLogAtSummaryTransformer.transform(
        input.activityLog,
      ),
    };
  }
}
