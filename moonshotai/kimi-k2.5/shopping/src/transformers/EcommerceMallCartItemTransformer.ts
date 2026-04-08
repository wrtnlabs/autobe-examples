import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";

export namespace EcommerceMallCartItemTransformer {
  export type Payload = Prisma.ecommerce_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
    stockContext?: {
      availableStock: number;
    },
  ): Promise<IEcommerceMallCartItem> {
    const variantPrice = input.productVariant.price ?? 0;
    const subtotal = input.quantity * variantPrice;
    let stockAvailability: IEcommerceMallCartItem["stockAvailability"] =
      "in_stock";
    if (stockContext) {
      if (stockContext.availableStock === 0) {
        stockAvailability = "out_of_stock";
      } else if (stockContext.availableStock < input.quantity) {
        stockAvailability = "low_stock";
      }
    }
    return {
      id: input.id,
      customer: {} satisfies IEcommerceMallCustomer.ISummary,
      productVariant:
        await EcommerceMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      quantity: input.quantity,
      subtotal,
      stockAvailability,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {},
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        productVariant:
          EcommerceMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
  }
}
