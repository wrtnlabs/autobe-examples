import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerSystemVersion";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTrackerSystemVersionAtSummaryTransformer {
  export type Payload = Prisma.hrm_tracker_system_versionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        version: true,
        applied_at: true,
        rollback_version: true,
      },
    } satisfies Prisma.hrm_tracker_system_versionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerSystemVersion.ISummary> {
    return {
      id: input.id,
      version: input.version,
      applied_at: input.applied_at.toISOString(),
    };
  }
}
