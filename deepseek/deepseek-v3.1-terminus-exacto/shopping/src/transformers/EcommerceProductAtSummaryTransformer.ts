import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCategoryAtSummaryTransformer } from "./EcommerceCategoryAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceProductAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: false,
        base_price: true,
        created_at: false,
        updated_at: false,
        deleted_at: false,
        seller: EcommerceSellerAtSummaryTransformer.select(),
        category: EcommerceCategoryAtSummaryTransformer.select(),
        metadataRegistryRelationships: false,
        images: false,
        variants: false,
        snapshots: false,
        cartItems: false,
        orderItemPurchaseSnapshots: false,
        reviews: false,
        administrativeActions: false,
      },
    } satisfies Prisma.ecommerce_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceProduct.ISummary> {
    return {
      id: input.id,
      name: input.name,
      base_price: input.base_price,
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
      category: await EcommerceCategoryAtSummaryTransformer.transform(
        input.category,
      ),
    };
  }
}
