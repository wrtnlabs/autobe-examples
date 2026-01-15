import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardSecurityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityLog";
import { IEventMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventMetadata";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSecurityLogTransformer {
  export type Payload = Prisma.discussion_board_security_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        event_type: true,
        ip: true,
        href: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_security_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSecurityLog> {
    return {
      id: input.id,
      timestamp: input.created_at.toISOString(),
      actorType: input.user ? "citizen" : "system",
      actorId: input.user?.id || "00000000-0000-0000-0000-000000000000",
      actionType: input.event_type,
      targetType: "system",
      targetId: undefined,
      sourceIp: input.ip,
      userAgent: undefined,
      eventDetails: input.description,
      resolutionStatus: "pending",
      severityLevel: "medium",
      auditSource: "security_service",
      eventId: input.href,
      metadata: "",
    };
  }
}
