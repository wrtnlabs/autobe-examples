import { IEcommerceMallApiLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallApiLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallApiLogTransformer {
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
        user_agent: true,
        authorization_header: true,
        request_body_hash: true,
        response_status: true,
        response_body_hash: true,
        latency_ms: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.ecommerce_mall_api_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallApiLog> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      method: input.method,
      user_agent: input.user_agent ?? undefined,
      authorization_header: input.authorization_header ?? undefined,
      request_body_hash: input.request_body_hash ?? undefined,
      response_status: input.response_status,
      response_body_hash: input.response_body_hash ?? undefined,
      latency_ms: input.latency_ms,
      error_message: input.error_message ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? undefined,
    };
  }
}
