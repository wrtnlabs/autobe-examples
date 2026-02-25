import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "./DiscussionBoardSuperAdminAtSummaryTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

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
        user: DiscussionBoardUserAtSummaryTransformer.select(),
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
        superAdmin: DiscussionBoardSuperAdminAtSummaryTransformer.select(),
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
      description: input.description,
      source_ip: input.source_ip,
      resolved: input.resolved,
      created_at: input.created_at.toISOString(),
      user: input.user
        ? await DiscussionBoardUserAtSummaryTransformer.transform(input.user)
        : null,
      admin: input.admin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(input.admin)
        : null,
      superAdmin: input.superAdmin
        ? await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
            input.superAdmin,
          )
        : null,
    };
  }
}
