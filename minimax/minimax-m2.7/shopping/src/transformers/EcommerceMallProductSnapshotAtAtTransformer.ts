import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallProductSnapshotAtAtTransformer {
  export type Payload = Prisma.ecommerce_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        category_name: true,
        created_at: true,
        product: EcommerceMallProductAtSummaryTransformer.select(),
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        productSnapshotImages: true,
        productSnapshotVariants: true,
        orderItems: true,
      },
    } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshot.IAt> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      category_name: input.category_name,
      created_at: toISOStringSafe(input.created_at),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    };
  }
}
