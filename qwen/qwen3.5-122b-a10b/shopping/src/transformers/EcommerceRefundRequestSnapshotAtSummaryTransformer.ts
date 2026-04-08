import { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceRefundRequestSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_refund_request_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        seller_response: true,
        response_at: true,
        created_at: true,
        refundRequest: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceRefundRequestSnapshot.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      seller_response: input.seller_response,
      response_at: input.response_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
    } satisfies IEcommerceRefundRequestSnapshot.ISummary;
  }
}
