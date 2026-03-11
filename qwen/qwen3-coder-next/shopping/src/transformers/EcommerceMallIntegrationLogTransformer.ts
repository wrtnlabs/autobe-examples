import { IEcommerceMallIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallIntegrationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallIntegrationLogTransformer {
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
        request_headers: true,
        request_body: true,
        response_status: true,
        response_headers: true,
        response_body: true,
        error_message: true,
        duration_ms: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_integration_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallIntegrationLog> {
    return {
      id: input.id,
      integration_type: input.integration_type,
      api_endpoint: input.api_endpoint,
      request_method: input.request_method,
      request_headers: input.request_headers,
      request_body: input.request_body,
      response_status: input.response_status,
      response_headers: input.response_headers,
      response_body: input.response_body,
      error_message: input.error_message ?? undefined,
      duration_ms: input.duration_ms,
      created_at: input.created_at.toISOString(),
    };
  }
}
