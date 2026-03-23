import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogChange";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformActivityLogChangeTransformer {
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
        activityLog: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.hrm_platform_activity_log_changesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformActivityLogChange> {
    return {
      id: input.id,
      hrm_platform_activity_log_id: input.activityLog.id,
      field_name: input.field_name,
      old_value: input.old_value ?? null,
      new_value: input.new_value ?? null,
      field_type: input.field_type,
      created_at: input.created_at.toISOString(),
    };
  }
}
