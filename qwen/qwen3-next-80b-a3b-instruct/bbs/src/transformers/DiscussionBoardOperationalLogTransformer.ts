import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardOperationalLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardOperationalLog";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardOperationalLogTransformer {
  export type Payload = Prisma.discussion_board_operational_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        component: true,
        severity: true,
        message: true,
        error_code: true,
        metadata: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_operational_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardOperationalLog> {
    const metadataObj = input.metadata ? JSON.parse(input.metadata) : {};
    // Map severity to exact literal type
    let event_severity: "info" | "error" | "warning" | "critical" | undefined;
    switch (input.severity) {
      case "info":
        event_severity = "info";
        break;
      case "error":
        event_severity = "error";
        break;
      case "warning":
        event_severity = "warning";
        break;
      case "critical":
        event_severity = "critical";
        break;
      default:
        event_severity = undefined;
    }
    return {
      id: input.id,
      action: `${input.component}: ${input.message}`,
      actor: metadataObj.actor ?? "system",
      target_resource: metadataObj.target_resource ?? undefined,
      event_severity,
      status: input.error_code
        ? input.error_code.startsWith("ERR")
          ? "failure"
          : "success"
        : "success",
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
