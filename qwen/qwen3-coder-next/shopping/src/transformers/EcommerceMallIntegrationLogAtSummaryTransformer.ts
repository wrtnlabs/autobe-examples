import { IEcommerceMallIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallIntegrationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallIntegrationLogAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_integration_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        integration_type: true,
        api_endpoint: true,
        request_method: true,
        response_status: true,
        error_message: true,
        duration_ms: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_integration_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallIntegrationLog.ISummary> {
    return {
      id: input.id,
      integration_type: input.integration_type,
      api_endpoint: input.api_endpoint,
      request_method: input.request_method,
      response_status: input.response_status,
      error_message: input.error_message ?? null,
      duration_ms: input.duration_ms,
      created_at: input.created_at.toISOString(),
    };
  }
}
