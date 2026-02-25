import { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformErrorLogAtSummaryTransformer {
  export type Payload = Prisma.community_platform_error_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        error_code: true,
        error_message: true,
        severity: true,
        source_component: true,
        stack_trace: true,
        request_id: true,
        user_agent: true,
        ip_address: true,
        http_status: true,
        error_context: true,
        resolved_at: true,
        resolution_status: true,
        resolution_notes: true,
        occurred_at: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.community_platform_error_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformErrorLog.ISummary> {
    return {
      id: input.id,
      error_code: input.error_code,
      error_message: input.error_message,
      severity: input.severity,
      source_component: input.source_component,
      resolution_status: input.resolution_status,
      occurred_at: input.occurred_at.toISOString(),
      created_at: input.created_at.toISOString(),
    };
  }
}
