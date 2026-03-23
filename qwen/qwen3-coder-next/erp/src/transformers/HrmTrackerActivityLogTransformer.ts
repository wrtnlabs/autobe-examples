import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerActivityLog";
import { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerGuestAtSummaryTransformer } from "./HrmTrackerGuestAtSummaryTransformer";
import { HrmTrackerMemberAtSummaryTransformer } from "./HrmTrackerMemberAtSummaryTransformer";

export namespace HrmTrackerActivityLogTransformer {
  export type Payload = Prisma.hrm_tracker_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_entity_type: true,
        target_entity_id: true,
        action_type: true,
        created_at: true,
        actorMember: HrmTrackerMemberAtSummaryTransformer.select(),
        actorGuest: HrmTrackerGuestAtSummaryTransformer.select(),
        details: true,
      },
    } satisfies Prisma.hrm_tracker_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerActivityLog> {
    return {
      id: input.id,
      target_entity_type: input.target_entity_type,
      target_entity_id: input.target_entity_id,
      action_type: input.action_type,
      created_at: input.created_at.toISOString(),
      actorMember: input.actorMember
        ? await HrmTrackerMemberAtSummaryTransformer.transform(
            input.actorMember,
          )
        : null,
      actorGuest: input.actorGuest
        ? await HrmTrackerGuestAtSummaryTransformer.transform(input.actorGuest)
        : null,
    };
  }
}
