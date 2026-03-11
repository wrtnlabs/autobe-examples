import { IEcommerceMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotificationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallNotificationQueueAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_notification_queuesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        type: true,
        user_id: true,
        content: true,
        status: true,
        error_message: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.ecommerce_mall_notification_queuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallNotificationQueue.ISummary> {
    return {
      id: input.id,
      type: input.type,
      user_id: input.user_id,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
