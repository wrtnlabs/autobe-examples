import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.IRequest;
}): Promise<IPageIShoppingMallWishlist.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const sort: "newest" | "oldest" = props.body.sort ?? "newest";
  const where: Prisma.shopping_mall_wishlistsWhereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    product: {
      deleted_at: null,
      ...(props.body.search === undefined
        ? {}
        : {
            OR: [
              { name: { contains: props.body.search, mode: "insensitive" } },
              {
                description: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            ],
          }),
    },
  };
  const records = await MyGlobal.prisma.shopping_mall_wishlists.findMany({
    where,
    orderBy: sort === "newest" ? { created_at: "desc" } : { created_at: "asc" },
    skip,
    take: limit,
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      product: {
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
              rejection_reason: true,
              account_status: true,
              approved_at: true,
              rejected_at: true,
              suspended_at: true,
              banned_at: true,
              last_login_at: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              sellerProfile: {
                select: {
                  id: true,
                  shop_name: true,
                  shop_description: true,
                  logo_image_url: true,
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
              parent: {
                select: {
                  id: true,
                  parent: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
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
  });
  const total = await MyGlobal.prisma.shopping_mall_wishlists.count({ where });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(records, async (record) => {
      const sellerProfile = record.product.seller.sellerProfile;
      const seller = {
        id: record.product.seller.id,
        email: record.product.seller.email,
        approvalStatus: record.product.seller.approval_status,
        rejectionReason: record.product.seller.rejection_reason,
        accountStatus: record.product.seller.account_status,
        approvedAt: record.product.seller.approved_at?.toISOString() ?? null,
        rejectedAt: record.product.seller.rejected_at?.toISOString() ?? null,
        suspendedAt: record.product.seller.suspended_at?.toISOString() ?? null,
        bannedAt: record.product.seller.banned_at?.toISOString() ?? null,
        lastLoginAt: record.product.seller.last_login_at?.toISOString() ?? null,
        createdAt: record.product.seller.created_at.toISOString(),
        updatedAt: record.product.seller.updated_at.toISOString(),
        deletedAt: record.product.seller.deleted_at?.toISOString() ?? null,
        sellerProfile:
          sellerProfile === null
            ? (null as never)
            : ({
                id: sellerProfile.id,
                seller: null as never,
                shopName: sellerProfile.shop_name,
                shopDescription: sellerProfile.shop_description,
                logoImageUrl: sellerProfile.logo_image_url,
                created_at: sellerProfile.created_at.toISOString(),
                updated_at: sellerProfile.updated_at.toISOString(),
                deleted_at: sellerProfile.deleted_at?.toISOString() ?? null,
              } satisfies IShoppingMallSellerProfile.ISummary),
      } satisfies IShoppingMallSeller.ISummary;
      return {
        id: record.id,
        product: {
          id: record.product.id,
          name: record.product.name,
          description: record.product.description,
          basePrice: record.product.base_price,
          seller,
          category:
            record.product.category === null
              ? null
              : ({
                  id: record.product.category.id,
                  parent:
                    record.product.category.parent === null
                      ? null
                      : ({
                          id: record.product.category.parent.id,
                          parent: null,
                          name: record.product.category.parent.name,
                          description:
                            record.product.category.parent.description,
                          created_at:
                            record.product.category.parent.created_at.toISOString(),
                          updated_at:
                            record.product.category.parent.updated_at.toISOString(),
                          deleted_at:
                            record.product.category.parent.deleted_at?.toISOString() ??
                            null,
                        } satisfies IShoppingMallCategory.ISummary),
                  name: record.product.category.name,
                  description: record.product.category.description,
                  created_at: record.product.category.created_at.toISOString(),
                  updated_at: record.product.category.updated_at.toISOString(),
                  deleted_at:
                    record.product.category.deleted_at?.toISOString() ?? null,
                } satisfies IShoppingMallCategory.ISummary),
          createdAt: record.product.created_at.toISOString(),
          updatedAt: record.product.updated_at.toISOString(),
          deletedAt: record.product.deleted_at?.toISOString() ?? null,
        } satisfies IShoppingMallProduct.ISummary,
        created_at: record.created_at.toISOString(),
        updated_at: record.updated_at.toISOString(),
        deleted_at: record.deleted_at?.toISOString() ?? null,
      } satisfies IShoppingMallWishlist.ISummary;
    }),
  };
}
