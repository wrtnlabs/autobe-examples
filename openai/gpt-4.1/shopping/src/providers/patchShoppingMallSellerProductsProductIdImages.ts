import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string;
  body: IShoppingMallProductImage.IRequest;
}): Promise<IPageIShoppingMallProductImage.ISummary> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
      title: true,
      default_price: true,
      business_status: true,
      created_at: true,
      shopping_mall_seller_id: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }

  const filters: Record<string, unknown> = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
  };
  if (typeof props.body.cdn_uri === "string") {
    filters.cdn_uri = props.body.cdn_uri;
  }
  if (typeof props.body.position === "number") {
    filters.position = props.body.position;
  }
  if (typeof props.body.label === "string") {
    filters.label = props.body.label;
  }
  if (typeof props.body.alt_text === "string") {
    filters.alt_text = { contains: props.body.alt_text };
  }
  if (typeof props.body.search === "string" && props.body.search.length > 0) {
    filters.OR = [
      { alt_text: { contains: props.body.search } },
      { label: { contains: props.body.search } },
    ];
  }

  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;

  const allowedSort = ["position", "created_at", "label"];
  const sortField = allowedSort.includes(props.body.sort_by ?? "")
    ? props.body.sort_by!
    : "position";
  const sortOrder = props.body.sort_order === "desc" ? "desc" : "asc";
  const orderBy = [{ [sortField]: sortOrder }];

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: filters,
      orderBy,
      skip,
      take: limit,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            default_price: true,
            business_status: true,
            created_at: true,
            shopping_mall_seller_id: true,
          },
        },
        sku: {
          select: {
            id: true,
            sku_code: true,
            product: { select: { title: true } },
            status: true,
            price: true,
            stock: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_product_images.count({ where: filters }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      cdn_uri: r.cdn_uri,
      alt_text: r.alt_text === null ? null : r.alt_text,
      position: r.position,
      label: r.label === null ? null : r.label,
      product: r.product
        ? {
            id: r.product.id,
            title: r.product.title,
            default_price: r.product.default_price,
            business_status: r.product.business_status,
            seller: {
              id: props.seller.id,
              business_name: "",
            },
            categories: [],
            created_at: toISOStringSafe(r.product.created_at),
          }
        : undefined,
      sku: r.sku
        ? {
            id: r.sku.id,
            code: r.sku.sku_code,
            product_title: r.sku.product.title,
            option_summary: "",
            in_stock: r.sku.status === "active" && r.sku.stock > 0,
          }
        : undefined,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at === null ? null : toISOStringSafe(r.deleted_at),
    })),
  };
}
