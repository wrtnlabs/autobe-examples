import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceRefundRequestAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        requested_at: true,
        refund_window_expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        seller: EcommerceSellerAtSummaryTransformer.select(),
        modificationSnapshots: true,
        statusHistories: true,
        refundResponses: true,
        inventoryRestorations: true,
      },
    } satisfies Prisma.ecommerce_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceRefundRequest.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      requested_at: input.requested_at.toISOString(),
      refund_window_expires_at: input.refund_window_expires_at.toISOString(),
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
    };
  }
}
