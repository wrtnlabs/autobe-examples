import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";
import { EcommerceMallProductImageTransformer } from "./EcommerceMallProductImageTransformer";
import { EcommerceMallProductVariantTransformer } from "./EcommerceMallProductVariantTransformer";

export namespace EcommerceMallProductTransformer {
  export type Payload = Prisma.ecommerce_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
        images: EcommerceMallProductImageTransformer.select(),
        variants: EcommerceMallProductVariantTransformer.select(),
        reviews: {
          select: {
            rating: true,
          },
        } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: input.base_price,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      seller: {
        id: input.seller.id,
        email: input.seller.email as string & tags.Format<"email">,
        shopName: "",
        approvalStatus: input.seller.approval_status,
        createdAt: input.seller.created_at.toISOString(),
        updatedAt: input.seller.updated_at.toISOString(),
        deletedAt: input.seller.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallSeller.ISummary,
      category: await EcommerceMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        EcommerceMallProductImageTransformer.transform,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        EcommerceMallProductVariantTransformer.transform,
      ),
      averageRating:
        input.reviews.length > 0
          ? input.reviews.reduce((sum, r) => sum + (r as any).rating, 0) /
            input.reviews.length
          : 0,
      reviewCount: input.reviews.length,
    };
  }
}
