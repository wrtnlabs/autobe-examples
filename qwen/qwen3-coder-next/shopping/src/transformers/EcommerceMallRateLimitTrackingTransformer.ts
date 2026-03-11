import { IEcommerceMallRateLimitTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRateLimitTracking";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallRateLimitTrackingTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_rate_limit_trackingsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        user_id: true,
        request_count: true,
        window_start: true,
        window_end: true,
        blocked: true,
        blocked_until: true,
      },
    } satisfies Prisma.ecommerce_mall_rate_limit_trackingsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRateLimitTracking> {
    return {
      id: input.id,
      ip: input.ip,
      user_id: input.user_id ?? null,
      request_count: input.request_count,
      window_start: input.window_start.toISOString(),
      window_end: input.window_end.toISOString(),
      blocked: input.blocked,
      blocked_until: input.blocked_until?.toISOString() ?? null,
    };
  }
}
