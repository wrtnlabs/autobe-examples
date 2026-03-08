import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";

export namespace DiscussionBoardAuditLogAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        action_type: true,
        resource_type: true,
        resource_id: true,
        metadata: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        member: DiscussionBoardMemberAtSummaryTransformer.select(),
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAuditLog.ISummary> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      action_type: input.action_type,
      resource_type: input.resource_type,
      resource_id: input.resource_id,
      member: input.member
        ? await DiscussionBoardMemberAtSummaryTransformer.transform(
            input.member,
          )
        : null,
      admin: input.admin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(input.admin)
        : null,
      metadata: input.metadata,
      ip_address: input.ip_address,
      user_agent: input.user_agent,
      created_at: input.created_at.toISOString(),
    };
  }
}
