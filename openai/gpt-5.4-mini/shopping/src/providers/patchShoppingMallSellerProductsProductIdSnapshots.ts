import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

export async function patchShoppingMallSellerProductsProductIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        name: true,
        description: true,
        base_price: true,
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
                shopping_mall_seller_id: true,
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
            parent: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const where: Prisma.shopping_mall_product_snapshotsWhereInput = {
    shopping_mall_product_id: props.productId,
    ...(props.body.fromVersion !== undefined ||
    props.body.toVersion !== undefined
      ? {
          snapshot_version: {
            ...(props.body.fromVersion !== undefined
              ? { gte: props.body.fromVersion }
              : {}),
            ...(props.body.toVersion !== undefined
              ? { lte: props.body.toVersion }
              : {}),
          },
        }
      : {}),
    ...(props.body.fromCapturedAt !== undefined ||
    props.body.toCapturedAt !== undefined
      ? {
          captured_at: {
            ...(props.body.fromCapturedAt !== undefined
              ? { gte: props.body.fromCapturedAt }
              : {}),
            ...(props.body.toCapturedAt !== undefined
              ? { lte: props.body.toCapturedAt }
              : {}),
          },
        }
      : {}),
  };
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const data = await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ snapshot_version: "desc" }, { captured_at: "desc" }],
    select: {
      id: true,
      shopping_mall_product_id: true,
      snapshot_version: true,
      captured_at: true,
      name: true,
      description_text: true,
      base_price: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_product_snapshots.count({
    where,
  });
  const categoryParentDto: IShoppingMallCategory.ISummary["parent"] =
    product.category === null || product.category.parent === null
      ? null
      : {
          id: product.category.parent.id,
          parent: null,
          name: product.category.parent.name,
          description: product.category.parent.description,
          created_at: toISOStringSafe(product.category.parent.created_at),
          updated_at: toISOStringSafe(product.category.parent.updated_at),
          deleted_at:
            product.category.parent.deleted_at === null
              ? null
              : toISOStringSafe(product.category.parent.deleted_at),
        };
  const categoryDto: IShoppingMallCategory.ISummary | null =
    product.category === null
      ? null
      : {
          id: product.category.id,
          parent: categoryParentDto,
          name: product.category.name,
          description: product.category.description,
          created_at: toISOStringSafe(product.category.created_at),
          updated_at: toISOStringSafe(product.category.updated_at),
          deleted_at:
            product.category.deleted_at === null
              ? null
              : toISOStringSafe(product.category.deleted_at),
        };
  const sellerBaseDto = {
    id: product.seller.id,
    email: product.seller.email,
    approvalStatus: product.seller.approval_status,
    rejectionReason: product.seller.rejection_reason,
    accountStatus: product.seller.account_status,
    approvedAt:
      product.seller.approved_at === null
        ? null
        : toISOStringSafe(product.seller.approved_at),
    rejectedAt:
      product.seller.rejected_at === null
        ? null
        : toISOStringSafe(product.seller.rejected_at),
    suspendedAt:
      product.seller.suspended_at === null
        ? null
        : toISOStringSafe(product.seller.suspended_at),
    bannedAt:
      product.seller.banned_at === null
        ? null
        : toISOStringSafe(product.seller.banned_at),
    lastLoginAt:
      product.seller.last_login_at === null
        ? null
        : toISOStringSafe(product.seller.last_login_at),
    createdAt: toISOStringSafe(product.seller.created_at),
    updatedAt: toISOStringSafe(product.seller.updated_at),
    deletedAt:
      product.seller.deleted_at === null
        ? null
        : toISOStringSafe(product.seller.deleted_at),
  };
  const sellerProfileStub: IShoppingMallSellerProfile.ISummary =
    product.seller.sellerProfile === null
      ? {
          id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          seller: undefined as unknown as IShoppingMallSeller.ISummary,
          shopName: "",
          shopDescription: "",
          logoImageUrl: "",
          created_at: toISOStringSafe(product.created_at),
          updated_at: toISOStringSafe(product.updated_at),
          deleted_at:
            product.deleted_at === null
              ? null
              : toISOStringSafe(product.deleted_at),
        }
      : {
          id: product.seller.sellerProfile.id,
          seller: undefined as unknown as IShoppingMallSeller.ISummary,
          shopName: product.seller.sellerProfile.shop_name,
          shopDescription: product.seller.sellerProfile.shop_description,
          logoImageUrl: product.seller.sellerProfile.logo_image_url,
          created_at: toISOStringSafe(product.seller.sellerProfile.created_at),
          updated_at: toISOStringSafe(product.seller.sellerProfile.updated_at),
          deleted_at:
            product.seller.sellerProfile.deleted_at === null
              ? null
              : toISOStringSafe(product.seller.sellerProfile.deleted_at),
        };
  const sellerDto: IShoppingMallSeller.ISummary = {
    ...sellerBaseDto,
    sellerProfile: sellerProfileStub,
  };
  const sellerProfileDto: IShoppingMallSellerProfile.ISummary = {
    ...sellerProfileStub,
    seller: sellerDto,
  };
  const shoppingMallProductDto: IShoppingMallProduct.ISummary = {
    id: product.id,
    name: product.name,
    description: product.description,
    basePrice: product.base_price,
    seller: sellerDto,
    category: categoryDto,
    createdAt: toISOStringSafe(product.created_at),
    updatedAt: toISOStringSafe(product.updated_at),
    deletedAt:
      product.deleted_at === null ? null : toISOStringSafe(product.deleted_at),
  };
  sellerDto.sellerProfile = sellerProfileDto;
  return {
    data: data.map((item) => ({
      id: item.id,
      shopping_mall_product: shoppingMallProductDto,
      snapshot_version: item.snapshot_version,
      captured_at: toISOStringSafe(item.captured_at),
      name: item.name,
      description_text: item.description_text,
      base_price: item.base_price,
      created_at: toISOStringSafe(item.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
