import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTrackerGuestAtSummaryTransformer {
  export type Payload = Prisma.hrm_tracker_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        created_at: true,
        device_fingerprint: true,
        password_hash: true,
        updated_at: true,
        deleted_at: true,
        hrmtrackerguestss: true,
        activityLogs: true,
      },
    } satisfies Prisma.hrm_tracker_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerGuest.ISummary> {
    return {
      id: input.id,
      email: input.email ?? null,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
