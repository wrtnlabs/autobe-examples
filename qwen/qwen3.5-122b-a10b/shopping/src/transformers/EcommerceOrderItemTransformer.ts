import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
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
import { EcommerceOrderAtSummaryTransformer } from "./EcommerceOrderAtSummaryTransformer";
import { EcommerceOrderItemSnapshotTransformer } from "./EcommerceOrderItemSnapshotTransformer";
import { EcommerceProductVariantAtSummaryTransformer } from "./EcommerceProductVariantAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceOrderItemTransformer {
  export type Payload = Prisma.ecommerce_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        unit_price: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: EcommerceOrderAtSummaryTransformer.select(),
        productVariant: EcommerceProductVariantAtSummaryTransformer.select(),
        seller: EcommerceSellerAtSummaryTransformer.select(),
        snapshot: EcommerceOrderItemSnapshotTransformer.select(),
        shipmentItems: {
          select: { id: true },
        } satisfies Prisma.ecommerce_shipment_itemsFindManyArgs,
        cancellationRequest: {
          select: { id: true },
        } satisfies Prisma.ecommerce_cancellation_requestsFindManyArgs,
        refundRequest: {
          select: { id: true },
        } satisfies Prisma.ecommerce_refund_requestsFindManyArgs,
        review: {
          select: { id: true },
        } satisfies Prisma.ecommerce_reviewsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceOrderItem> {
    return {
      id: input.id,
      quantity: input.quantity,
      unit_price: input.unit_price,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      order: await EcommerceOrderAtSummaryTransformer.transform(input.order),
      productVariant:
        await EcommerceProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
      snapshot: await EcommerceOrderItemSnapshotTransformer.transform(
        input.snapshot!,
      ),
    } satisfies IEcommerceOrderItem;
  }
}
