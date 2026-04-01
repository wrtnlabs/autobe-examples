import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallRefundRequestAtRejectTransformer {
  export type Payload = Prisma.ecommerce_mall_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        refund_code: true,
        status: true,
        reason: true,
        evidence_description: true,
        seller_response: true,
        rejection_reason: true,
        delivery_date: true,
        submitted_at: true,
        decision_at: true,
        processed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: true,
        orderItem: true,
        inventoryRecords: true,
        snapshots: true,
      },
    } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequest.IReject> {
    return {
      rejection_reason: input.rejection_reason ?? undefined,
    };
  }
}
