import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import { IShoppingMallOrderCancellationRequestLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequestLog";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdminAtSummaryTransformer } from "./ShoppingMallAdminAtSummaryTransformer";
import { ShoppingMallOrderCancellationRequestAtSummaryTransformer } from "./ShoppingMallOrderCancellationRequestAtSummaryTransformer";

export namespace ShoppingMallOrderCancellationRequestLogTransformer {
  export type Payload =
    Prisma.shopping_mall_order_cancellation_request_logsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        from_status: true,
        to_status: true,
        rejection_reason: true,
        created_at: true,
        cancellationRequest:
          ShoppingMallOrderCancellationRequestAtSummaryTransformer.select(),
        responder: ShoppingMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_cancellation_request_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderCancellationRequestLog> {
    return {
      id: input.id,
      from_status: input.from_status,
      to_status: input.to_status,
      rejection_reason: input.rejection_reason ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      shopping_mall_order_cancellation_request_id: input.cancellationRequest.id,
      responded_by: input.responder?.id ?? undefined,
      cancellationRequest:
        await ShoppingMallOrderCancellationRequestAtSummaryTransformer.transform(
          input.cancellationRequest,
        ),
      responder: input.responder
        ? await ShoppingMallAdminAtSummaryTransformer.transform(input.responder)
        : null,
    };
  }
}
