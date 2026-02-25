import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function patchShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const {
    search,
    sellerId,
    productCategoryId,
    productSubcategoryId,
    priceMin,
    priceMax,
    page = 1,
    limit = 20,
    sort,
  } = props.body;
  if (
    sellerId !== undefined &&
    sellerId !== null &&
    sellerId !== props.seller.id
  ) {
    throw new HttpException(
      "Forbidden: Cannot query other seller's products",
      403,
    );
  }
  const take = limit > 100 ? 100 : limit < 1 ? 1 : limit;
  const currentPage = page < 1 ? 1 : page;
  const skip = (currentPage - 1) * take;
  const where: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
    seller_id: props.seller.id,
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    ...(productSubcategoryId
      ? { product_subcategory_id: productSubcategoryId }
      : {}),
  };
  if (productCategoryId) {
    where.productSubcategory = { is: { category: { id: productCategoryId } } };
  }
  if (priceMin !== null && priceMin !== undefined) {
    where.base_price = { gte: priceMin };
  }
  if (priceMax !== null && priceMax !== undefined) {
    where.base_price = { lte: priceMax };
  }
  const orderBy =
    sort === "base_price_asc"
      ? { base_price: "asc" as const }
      : sort === "base_price_desc"
        ? { base_price: "desc" as const }
        : sort === "name_asc"
          ? { name: "asc" as const }
          : sort === "name_desc"
            ? { name: "desc" as const }
            : { created_at: "desc" as const };
  const [products, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findMany({
      where,
      take,
      skip,
      orderBy,
      select: {
        id: true,
        name: true,
        base_price: true,
        seller: {
          select: {
            id: true,
            email: true,
            shop_name: true,
            shop_description: true,
            logo_uri: true,
            approval_status: true,
            rejection_reason: true,
          },
        },
        productSubcategory: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            category: {
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
    }),
    MyGlobal.prisma.shopping_mall_products.count({ where }),
  ]);
  return {
    data: products.map((product) => ({
      id: product.id,
      name: product.name,
      basePrice: product.base_price,
      seller: {
        id: product.seller.id,
        email: product.seller.email,
        shopName: product.seller.shop_name,
        shopDescription: product.seller.shop_description ?? null,
        logoUri: product.seller.logo_uri ?? null,
        approvalStatus: product.seller.approval_status,
        rejectionReason: product.seller.rejection_reason ?? null,
      },
      productSubcategory: {
        id: product.productSubcategory.id,
        name: product.productSubcategory.name,
        description: product.productSubcategory.description,
        created_at: toISOStringSafe(
          product.productSubcategory.created_at,
        ) as string & tags.Format<"date-time">,
        updated_at: toISOStringSafe(
          product.productSubcategory.updated_at,
        ) as string & tags.Format<"date-time">,
        deleted_at: product.productSubcategory.deleted_at
          ? (toISOStringSafe(product.productSubcategory.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
        category: {
          id: product.productSubcategory.category.id,
          name: product.productSubcategory.category.name,
          description: product.productSubcategory.category.description,
          created_at: toISOStringSafe(
            product.productSubcategory.category.created_at,
          ) as string & tags.Format<"date-time">,
          updated_at: toISOStringSafe(
            product.productSubcategory.category.updated_at,
          ) as string & tags.Format<"date-time">,
          deleted_at: product.productSubcategory.category.deleted_at
            ? (toISOStringSafe(
                product.productSubcategory.category.deleted_at,
              ) as string & tags.Format<"date-time">)
            : null,
        },
      },
    })),
    pagination: {
      current: currentPage as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: take as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / take) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
