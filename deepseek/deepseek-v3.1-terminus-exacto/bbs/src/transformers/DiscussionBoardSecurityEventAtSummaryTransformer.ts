import { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSecurityEventAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_security_eventsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        event_type: true,
        severity: true,
        description: true,
        source_ip: true,
        user_agent: true,
        event_data: true,
        resolved: true,
        resolved_at: true,
        resolved_by: true,
        created_at: true,
        updated_at: true,
        user: true,
        admin: true,
        superAdmin: true,
      },
    } satisfies Prisma.discussion_board_security_eventsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSecurityEvent.ISummary> {
    return {
      id: input.id,
      event_type: input.event_type,
      severity: input.severity,
      resolved: input.resolved,
      created_at: input.created_at.toISOString(),
      resolved_at: input.resolved_at?.toISOString() ?? null,
    };
  }
}
