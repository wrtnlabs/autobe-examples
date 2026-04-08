import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  // Recursive type for category nodes at any nesting depth
  type CategoryNode = {
    id: string;
    name: string;
    description: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    parentCategory?: CategoryNode | null;
  };
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
            created_at: true,
            sellerProfile: {
              select: {
                id: true,
                shop_name: true,
                shop_description: true,
                logo_uri: true,
                approval_status: true,
                rejection_reason: true,
                is_suspended: true,
                is_banned: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            parentCategory: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                parentCategory: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
        wishlistEntries: {
          select: {},
        } satisfies Prisma.shopping_mall_customer_wishlistsFindManyArgs,
        images: {
          select: {
            image_uri: true,
            display_order: true,
          },
        } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
        variants: {
          select: {
            deleted_at: true,
            inventoryRecords: {
              select: {
                quantity_change: true,
              },
            },
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
        reviews: {
          select: {},
        } satisfies Prisma.shopping_mall_reviewsFindManyArgs,
        productSnapshots: {
          select: {},
        } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProduct.ISummary> {
    // Compute main_image_uri from images (first by display_order)
    const sortedImages = [...input.images].sort(
      (a, b) => a.display_order - b.display_order,
    );
    const main_image_uri =
      sortedImages.length > 0 ? sortedImages[0].image_uri : null;
    // Compute image_count
    const image_count = input.images.length;
    // Compute variant_count (non-deleted variants)
    const activeVariants = input.variants.filter((v) => v.deleted_at === null);
    const variant_count = activeVariants.length;
    // Compute in_stock from variant inventory records
    const in_stock = activeVariants.some((variant) => {
      const totalStock = variant.inventoryRecords.reduce(
        (sum, record) => sum + record.quantity_change,
        0,
      );
      return totalStock > 0;
    });
    // Transform seller to IShoppingMallSeller.ISummary
    const sellerProfile = input.seller.sellerProfile;
    const seller = {
      id: input.seller.id,
      email: input.seller.email,
      created_at: toISOStringSafe(input.seller.created_at),
      approval_status: sellerProfile?.approval_status ?? "pending",
      approval_reason: null,
      rejection_reason: sellerProfile?.rejection_reason ?? null,
      suspended: sellerProfile?.is_suspended ?? false,
      banned: sellerProfile?.is_banned ?? false,
      seller_profile: sellerProfile
        ? ({
            id: sellerProfile.id,
            shop_name: sellerProfile.shop_name,
            shop_description: sellerProfile.shop_description,
            logo_uri: sellerProfile.logo_uri,
            approval_status: sellerProfile.approval_status,
            rejection_reason: sellerProfile.rejection_reason,
            is_suspended: sellerProfile.is_suspended,
            is_banned: sellerProfile.is_banned,
            created_at: toISOStringSafe(sellerProfile.created_at),
            updated_at: toISOStringSafe(sellerProfile.updated_at),
            deleted_at: sellerProfile.deleted_at
              ? toISOStringSafe(sellerProfile.deleted_at)
              : null,
          } as IShoppingMallSellerProfile)
        : (null as unknown as IShoppingMallSellerProfile),
    };
    // Transform category to IShoppingMallCategory.ISummary | null
    const transformCategory = (
      cat: CategoryNode | null | undefined,
    ): IShoppingMallCategory.ISummary | null => {
      if (!cat) return null;
      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        created_at: toISOStringSafe(cat.created_at),
        updated_at: toISOStringSafe(cat.updated_at),
        deleted_at: cat.deleted_at ? toISOStringSafe(cat.deleted_at) : null,
        parentCategory: transformCategory(cat.parentCategory),
      };
    };
    const category = transformCategory(input.category as CategoryNode);
    return {
      id: input.id,
      name: input.name,
      base_price: input.base_price,
      seller: seller,
      category: category,
      main_image_uri: main_image_uri,
      variant_count: variant_count,
      image_count: image_count,
      in_stock: in_stock,
      created_at: toISOStringSafe(input.created_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_productsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             base_price: true,
//             main_image_uri: true,
//             variant_count: true,
//             image_count: true,
//             in_stock: true,
//             created_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.shopping_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProduct.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   base_price: {number},
//   seller: {IShoppingMallSeller.ISummary},
//   category: {IShoppingMallCategory.ISummary | null},
//   main_image_uri: {string | null},
//   variant_count: {integer},
//   image_count: {integer},
//   in_stock: {boolean},
//   created_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------