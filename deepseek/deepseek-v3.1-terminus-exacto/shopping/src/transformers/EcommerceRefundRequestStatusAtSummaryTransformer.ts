import { IEcommerceRefundRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceRefundRequestStatusAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_refund_request_statusesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        created_at: true,
        reason: true,
      },
    } satisfies Prisma.ecommerce_refund_request_statusesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceRefundRequestStatus.ISummary> {
    return {
      id: input.id,
      status: input.status,
      created_at: input.created_at.toISOString(),
      reason: input.reason ?? null,
    };
  }
}
