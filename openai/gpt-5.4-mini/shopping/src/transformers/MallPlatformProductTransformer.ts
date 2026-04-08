import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCategoryAtSummaryTransformer } from "./MallPlatformCategoryAtSummaryTransformer";
import { MallPlatformCustomerAtSummaryTransformer } from "./MallPlatformCustomerAtSummaryTransformer";
import { MallPlatformProductImageTransformer } from "./MallPlatformProductImageTransformer";
import { MallPlatformProductSnapshotTransformer } from "./MallPlatformProductSnapshotTransformer";
import { MallPlatformProductVariantSnapshotTransformer } from "./MallPlatformProductVariantSnapshotTransformer";
import { MallPlatformProductVariantTransformer } from "./MallPlatformProductVariantTransformer";
import { MallPlatformSellerAtSummaryTransformer } from "./MallPlatformSellerAtSummaryTransformer";
import { MallPlatformWishlistItemTransformer } from "./MallPlatformWishlistItemTransformer";

export namespace MallPlatformProductTransformer {
  export type Payload = Prisma.mall_platform_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sellerAccount: MallPlatformSellerAtSummaryTransformer.select(),
        category: MallPlatformCategoryAtSummaryTransformer.select(),
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        images: MallPlatformProductImageTransformer.select(),
        variants: MallPlatformProductVariantTransformer.select(),
        productImageSnapshots: {
          select: {
            id: true,
            image_uri: true,
            created_at: true,
          },
        } satisfies Prisma.mall_platform_product_image_snapshotsFindManyArgs,
        variantSnapshots:
          MallPlatformProductVariantSnapshotTransformer.select(),
        wishlistItems: MallPlatformWishlistItemTransformer.select(),
        reviews: {
          select: {
            reviewId: true,
            customer: MallPlatformCustomerAtSummaryTransformer.select(),
            displayState: true,
          },
        } satisfies Prisma.mall_platform_reviewsFindManyArgs,
        snapshots: MallPlatformProductSnapshotTransformer.select(),
      },
    } satisfies Prisma.mall_platform_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProduct> {
    return {
      id: input.id,
      sellerAccount: await MallPlatformSellerAtSummaryTransformer.transform(
        input.sellerAccount,
      ),
      category:
        input.category === null
          ? null
          : await MallPlatformCategoryAtSummaryTransformer.transform(
              input.category,
            ),
      name: input.name,
      description: input.description,
      basePrice: Number(input.base_price),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      images: await ArrayUtil.asyncMap(
        input.images,
        MallPlatformProductImageTransformer.transform,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        MallPlatformProductVariantTransformer.transform,
      ),
      productImageSnapshots: await ArrayUtil.asyncMap(
        input.productImageSnapshots,
        async (row) =>
          ({
            id: row.id,
            imageUri: row.image_uri,
            sortOrder: 0,
            createdAt: row.created_at.toISOString(),
          }) satisfies IMallPlatformProductImageSnapshot.ISummary,
      ),
      variantSnapshots: await ArrayUtil.asyncMap(
        input.variantSnapshots,
        MallPlatformProductVariantSnapshotTransformer.transform,
      ),
      wishlistItems: await ArrayUtil.asyncMap(
        input.wishlistItems,
        MallPlatformWishlistItemTransformer.transform,
      ),
      reviews: await ArrayUtil.asyncMap(
        input.reviews,
        async (row) =>
          ({
            reviewId: row.reviewId,
            customer: await MallPlatformCustomerAtSummaryTransformer.transform(
              row.customer,
            ),
            displayState: row.displayState,
          }) satisfies IMallPlatformReview,
      ),
      snapshots: await ArrayUtil.asyncMap(
        input.snapshots,
        MallPlatformProductSnapshotTransformer.transform,
      ),
    } satisfies IMallPlatformProduct;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformProductTransformer {
//       export type Payload = Prisma.mall_platform_productsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             base_price: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller_account_id: true,
//             category: MallPlatformCategoryAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.mall_platform_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformProduct> {
//         return {
//   id: {string},
//   sellerAccount: {IMallPlatformSeller.ISummary},
//   category: input.category ? await MallPlatformCategoryAtSummaryTransformer.transform(input.category) : null,
//   name: {string},
//   description: {string},
//   basePrice: {number},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   images: {Array<IMallPlatformProductImage>},
//   variants: {Array<IMallPlatformProductVariant>},
//   productImageSnapshots: {Array<IMallPlatformProductImageSnapshot>},
//   variantSnapshots: {Array<IMallPlatformProductVariantSnapshot>},
//   wishlistItems: {Array<IMallPlatformWishlistItem>},
//   reviews: {Array<IMallPlatformReview>},
//   snapshots: {Array<IMallPlatformProductSnapshot>},
//         };
//       }
//     }
//--------------------------------------------------------------