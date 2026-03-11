import { IEcommerceMallScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallScheduledTaskAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_scheduled_tasksGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        cron_expression: true,
        next_execution_at: true,
        is_active: true,
        status: true,
        last_execution_status: true,
      },
    } satisfies Prisma.ecommerce_mall_scheduled_tasksFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallScheduledTask.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      cron_expression: input.cron_expression,
      next_execution_at: input.next_execution_at.toISOString(),
      is_active: input.is_active,
      status: input.status,
      last_execution_status: input.last_execution_status ?? null,
    };
  }
}
