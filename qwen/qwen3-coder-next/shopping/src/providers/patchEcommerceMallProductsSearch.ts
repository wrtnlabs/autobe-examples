import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsSearch(props: {
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    seller: {
      is_suspended: false,
    },
    ...(props.body.search && {
      name: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.category_id && {
      category_id: props.body.category_id,
    }),
    ...(props.body.min_price !== undefined && {
      base_price: { gt: props.body.min_price },
    }),
    ...(props.body.max_price !== undefined && {
      base_price: { lt: props.body.max_price },
    }),
  } satisfies Prisma.ecommerce_mall_productsWhereInput;
  const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy:
      props.body.sort === "base_price_asc"
        ? { base_price: "asc" as const }
        : props.body.sort === "base_price_desc"
          ? { base_price: "desc" as const }
          : { created_at: "desc" as const },
    select: {
      id: true,
      name: true,
      base_price: true,
      created_at: true,
      is_available: true,
      seller_id: true,
      images: {
        where: { is_main: true, deleted_at: null },
        select: {
          id: true,
          image_url: true,
          sort_order: true,
          is_main: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
        take: 1,
      },
    },
  });
  const sellers = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where: {
      id: { in: [...new Set(products.map((p) => p.seller_id))] },
    },
    select: {
      id: true,
      shop_name: true,
      approval_status: true,
      is_suspended: true,
      created_at: true,
    },
  });
  const variants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: {
        product_id: { in: products.map((p) => p.id) },
      },
      select: {
        product_id: true,
        stock_quantity: true,
      },
    });
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: whereInput,
  });
  const mappedProducts = products
    .map((record) => {
      const seller = sellers.find((s) => s.id === record.seller_id);
      const mainImageRecord = record.images[0] || null;
      const hasInStockVariant = variants.some(
        (v) => v.product_id === record.id && v.stock_quantity > 0,
      );
      const isInStock = props.body.in_stock ? hasInStockVariant : true;
      if (!mainImageRecord) {
        return null;
      }
      return {
        id: record.id,
        name: record.name,
        base_price: record.base_price,
        is_available: record.is_available && isInStock,
        created_at: record.created_at.toISOString(),
        seller: {
          id: (seller?.id ?? ("" as string & tags.Format<"uuid">)) as string &
            tags.Format<"uuid">,
          shop_name: seller?.shop_name ?? "",
          approval_status: seller?.approval_status ?? "pending",
          is_suspended: seller?.is_suspended ?? false,
          created_at: (
            seller?.created_at ?? new Date("9999-12-31T23:59:59.999Z")
          ).toISOString(),
        },
        main_image: {
          id: mainImageRecord.id,
          image_url: mainImageRecord.image_url,
          sort_order: mainImageRecord.sort_order,
          is_main: mainImageRecord.is_main,
          created_at: mainImageRecord.created_at.toISOString(),
          updated_at: mainImageRecord.updated_at.toISOString(),
          deleted_at: mainImageRecord.deleted_at?.toISOString() ?? null,
        } satisfies IEcommerceMallProductImage.ISummary,
      } satisfies IEcommerceMallProduct.ISummary;
    })
    .filter((x): x is IEcommerceMallProduct.ISummary => x !== null);
  return {
    data: mappedProducts,
    pagination: {
      current: page satisfies number & tags.Type<"int32"> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number & tags.Type<"int32"> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
  } satisfies IPageIEcommerceMallProduct.ISummary;
}
