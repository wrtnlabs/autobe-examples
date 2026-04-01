import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImageSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerProductsProductIdImageSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImageSnapshot.IRequest;
}): Promise<IPageIMallPlatformProductImageSnapshot.ISummary> {
  const product = await MyGlobal.prisma.mall_platform_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
        seller_account_id: props.seller.id,
      },
      select: {
        id: true,
        seller_account_id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sellerAccount: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            rejection_reason: true,
            suspended_at: true,
            deleted_at: true,
            created_at: true,
            updated_at: true,
          },
        },
        category: {
          select: {
            id: true,
            parentCategory: {
              select: {
                id: true,
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
  );
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.pageSize ?? props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const sortDirection: "asc" | "desc" =
    props.body.sort === "oldest" ? "asc" : "desc";
  const snapshots =
    await MyGlobal.prisma.mall_platform_product_image_snapshots.findMany({
      where: {
        mall_platform_product_id: props.productId,
      },
      orderBy: [
        {
          changed_at: sortDirection,
        },
        {
          created_at: sortDirection,
        },
        {
          id: sortDirection,
        },
      ],
      skip,
      take: limit,
      select: {
        id: true,
        mall_platform_product_id: true,
        image_url: true,
        image_order: true,
        is_main: true,
        changed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const total: number =
    await MyGlobal.prisma.mall_platform_product_image_snapshots.count({
      where: {
        mall_platform_product_id: props.productId,
      },
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: snapshots.map((snapshot) => ({
      id: snapshot.id,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        basePrice: product.base_price,
        sellerAccount: {
          id: product.sellerAccount.id,
          email: product.sellerAccount.email,
          approvalStatus: product.sellerAccount.approval_status,
          rejectionReason: product.sellerAccount.rejection_reason,
          suspendedAt:
            product.sellerAccount.suspended_at?.toISOString() ?? null,
          deletedAt: product.sellerAccount.deleted_at?.toISOString() ?? null,
          createdAt: product.sellerAccount.created_at.toISOString(),
          updatedAt: product.sellerAccount.updated_at.toISOString(),
        },
        category:
          product.category === null
            ? null
            : {
                id: product.category.id,
                parentCategory: null,
                name: product.category.name,
                description: product.category.description,
                createdAt: product.category.created_at.toISOString(),
                updatedAt: product.category.updated_at.toISOString(),
                deletedAt: product.category.deleted_at?.toISOString() ?? null,
              },
        createdAt: product.created_at.toISOString(),
        updatedAt: product.updated_at.toISOString(),
        deletedAt: product.deleted_at?.toISOString() ?? null,
      },
      imageUrl: snapshot.image_url,
      imageOrder: snapshot.image_order,
      isMain: snapshot.is_main,
      changedAt: snapshot.changed_at.toISOString(),
      createdAt: snapshot.created_at.toISOString(),
      updatedAt: snapshot.updated_at.toISOString(),
      deletedAt: snapshot.deleted_at?.toISOString() ?? null,
    })),
  };
}
