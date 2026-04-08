import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceOrderItemAtSummaryTransformer } from "./EcommerceOrderItemAtSummaryTransformer";

export namespace EcommerceCancellationRequestAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_cancellation_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        seller_response: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: EcommerceOrderItemAtSummaryTransformer.select(),
        snapshots: {
          select: { id: true },
        } satisfies Prisma.ecommerce_cancellation_request_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCancellationRequest.ISummary> {
    return {
      id: input.id,
      status: input.status,
      reason: input.reason,
      seller_response: input.seller_response ?? null,
      order_item: await EcommerceOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceCancellationRequest.ISummary;
  }
}
