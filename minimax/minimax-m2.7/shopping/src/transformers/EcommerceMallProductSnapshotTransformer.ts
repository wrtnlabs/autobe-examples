import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductSnapshotVariantTransformer } from "./EcommerceMallProductSnapshotVariantTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallProductSnapshotTransformer {
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
        productSnapshotImages: {
          select: {
            id: true,
            url: true,
            display_order: true,
            created_at: true,
            updated_at: true,
          },
          orderBy: {
            display_order: "asc",
          },
        } satisfies Prisma.ecommerce_mall_product_snapshot_imagesFindManyArgs,
        productSnapshotVariants:
          EcommerceMallProductSnapshotVariantTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshot> {
    const seller = await EcommerceMallSellerAtSummaryTransformer.transform(
      input.seller,
    );
    const snapshotSummary: IEcommerceMallProductSnapshot.ISummary = {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      category_name: input.category_name,
      created_at: toISOStringSafe(input.created_at),
      seller: seller,
    };
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: input.base_price,
      categoryName: input.category_name,
      createdAt: toISOStringSafe(input.created_at),
      product: input.product
        ? await EcommerceMallProductAtSummaryTransformer.transform(
            input.product,
          )
        : undefined,
      seller: seller,
      images: await ArrayUtil.asyncMap(
        input.productSnapshotImages,
        async (img): Promise<IEcommerceMallProductSnapshotImage> => ({
          id: img.id,
          url: img.url,
          displayOrder: img.display_order,
          createdAt: toISOStringSafe(img.created_at),
          updatedAt: toISOStringSafe(img.updated_at),
          productSnapshot: snapshotSummary,
        }),
      ),
      variants: await ArrayUtil.asyncMap(
        input.productSnapshotVariants,
        EcommerceMallProductSnapshotVariantTransformer.transform,
      ),
    };
  }
}
