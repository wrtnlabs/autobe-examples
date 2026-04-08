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
import { EcommerceOrderAtSummaryTransformer } from "./EcommerceOrderAtSummaryTransformer";
import { EcommerceProductVariantAtSummaryTransformer } from "./EcommerceProductVariantAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceOrderItemAtSummaryTransformer {
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
        snapshot: { select: { id: true } },
        shipmentItems: {
          select: { id: true },
        } satisfies Prisma.ecommerce_shipment_itemsFindManyArgs,
        cancellationRequest: { select: { id: true } },
        refundRequest: { select: { id: true } },
        review: { select: { id: true } },
      },
    } satisfies Prisma.ecommerce_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceOrderItem.ISummary> {
    return {
      id: input.id,
      quantity: input.quantity,
      unit_price: input.unit_price,
      status: input.status,
      order: await EcommerceOrderAtSummaryTransformer.transform(input.order),
      productVariant:
        await EcommerceProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceOrderItem.ISummary;
  }
}
