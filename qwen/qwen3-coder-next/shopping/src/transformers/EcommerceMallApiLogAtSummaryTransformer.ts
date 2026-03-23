import { IEcommerceMallApiLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallApiLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallApiLogAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_api_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        method: true,
        response_status: true,
        latency_ms: true,
        error_message: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_api_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallApiLog.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      method: input.method,
      response_status: input.response_status,
      latency_ms: input.latency_ms,
      error_message: input.error_message ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
