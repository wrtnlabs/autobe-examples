import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceOrderItemAtSummaryTransformer } from "./EcommerceOrderItemAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceRefundRequestTransformer {
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
        orderItem: EcommerceOrderItemAtSummaryTransformer.select(),
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        seller: EcommerceSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceRefundRequest> {
    return {
      id: input.id,
      reason: input.reason,
      requested_at: input.requested_at.toISOString(),
      refund_window_expires_at: input.refund_window_expires_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      orderItem: await EcommerceOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
    };
  }
}
