import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceProductVariantAtSummaryTransformer } from "./EcommerceProductVariantAtSummaryTransformer";

export namespace EcommerceOrderItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        price: true,
        status: true,
        created_at: true,
        variant: EcommerceProductVariantAtSummaryTransformer.select(),
        updated_at: true,
        deleted_at: true,
        order: {
          select: {
            id: true,
          },
        },
        orderItems: {
          select: {
            id: true,
          },
        },
        cancellationRequests: {
          select: {
            id: true,
          },
        },
        refundRequests: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceOrderItem.ISummary> {
    return {
      id: input.id,
      quantity: input.quantity,
      price: input.price,
      status: typia.assert<
        "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
      >(input.status),
      created_at: toISOStringSafe(input.created_at),
      variant: await EcommerceProductVariantAtSummaryTransformer.transform(
        input.variant,
      ),
    };
  }
}
