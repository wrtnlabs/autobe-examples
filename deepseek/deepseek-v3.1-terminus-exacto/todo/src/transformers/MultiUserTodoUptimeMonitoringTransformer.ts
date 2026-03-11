import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUptimeMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUptimeMonitoring";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoUptimeMonitoringTransformer {
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
  ): Promise<IMultiUserTodoUptimeMonitoring> {
    return {
      id: input.id,
      serviceName: input.service_name,
      serviceEndpoint: input.service_endpoint,
      checkIntervalMinutes: input.check_interval_minutes,
      responseTimeMs: input.response_time_ms,
      statusCode: input.status_code,
      isHealthy: input.is_healthy,
      uptimePercentage: input.uptime_percentage,
      downtimeMinutes: input.downtime_minutes,
      lastSuccessfulCheck:
        input.last_successful_check?.toISOString() ?? undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? undefined,
    };
  }
}
