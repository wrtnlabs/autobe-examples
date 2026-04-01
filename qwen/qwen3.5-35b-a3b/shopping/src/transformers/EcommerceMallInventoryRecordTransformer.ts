import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCancellationRequestAtSummaryTransformer } from "./EcommerceMallCancellationRequestAtSummaryTransformer";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";
import { EcommerceMallRefundRequestAtSummaryTransformer } from "./EcommerceMallRefundRequestAtSummaryTransformer";

export namespace EcommerceMallInventoryRecordTransformer {
  export type Payload = Prisma.ecommerce_mall_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_change: true,
        remaining_quantity: true,
        reason: true,
        type: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        variant: EcommerceMallProductVariantAtSummaryTransformer.select(),
        order: EcommerceMallOrderAtSummaryTransformer.select(),
        cancellationRequest:
          EcommerceMallCancellationRequestAtSummaryTransformer.select(),
        refundRequest: EcommerceMallRefundRequestAtSummaryTransformer.select(),
        snapshots: true,
      },
    } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallInventoryRecord> {
    return {
      id: input.id,
      variant_id: input.variant.id,
      order_id: input.order?.id ?? undefined,
      cancellation_request_id: input.cancellationRequest?.id ?? undefined,
      refund_request_id: input.refundRequest?.id ?? undefined,
      quantity_change: input.quantity_change,
      remaining_quantity: input.remaining_quantity,
      reason: input.reason,
      type: input.type,
      description: input.description ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      variant: await EcommerceMallProductVariantAtSummaryTransformer.transform(
        input.variant,
      ),
      order: input.order
        ? await EcommerceMallOrderAtSummaryTransformer.transform(input.order)
        : null,
      cancellationRequest: input.cancellationRequest
        ? await EcommerceMallCancellationRequestAtSummaryTransformer.transform(
            input.cancellationRequest,
          )
        : null,
      refundRequest: input.refundRequest
        ? await EcommerceMallRefundRequestAtSummaryTransformer.transform(
            input.refundRequest,
          )
        : null,
    };
  }
}
