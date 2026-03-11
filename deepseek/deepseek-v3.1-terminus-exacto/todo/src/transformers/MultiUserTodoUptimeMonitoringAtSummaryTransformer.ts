import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUptimeMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUptimeMonitoring";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoUptimeMonitoringAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_uptime_monitoringsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        service_name: true,
        service_endpoint: true,
        check_interval_minutes: true,
        response_time_ms: true,
        status_code: true,
        is_healthy: true,
        uptime_percentage: true,
        downtime_minutes: true,
        last_successful_check: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.multi_user_todo_uptime_monitoringsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoUptimeMonitoring.ISummary> {
    return {
      id: input.id,
      service_name: input.service_name,
      is_healthy: input.is_healthy,
      response_time_ms: input.response_time_ms,
      uptime_percentage: input.uptime_percentage,
      created_at: input.created_at.toISOString(),
    };
  }
}
