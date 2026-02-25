import { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommercePlatformEventAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_eventsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        event_type: true,
        event_severity: true,
        event_source: true,
        correlation_id: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_platform_eventsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformEvent.ISummary> {
    return {
      id: input.id,
      event_type: input.event_type,
      event_severity: input.event_severity,
      event_source: input.event_source,
      correlation_id: input.correlation_id ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
