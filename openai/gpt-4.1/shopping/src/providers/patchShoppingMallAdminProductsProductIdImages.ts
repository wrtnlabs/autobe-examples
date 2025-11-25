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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdImages(props: {
  admin: AdminPayload;
  productId: string;
  body: IShoppingMallProductImage.IRequest;
}): Promise<IPageIShoppingMallProductImage.ISummary> {
  // 1. Confirm product exists and not soft-deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId, deleted_at: null },
  });
  if (!product) {
    throw new HttpException("Product not found or deleted", 404);
  }

  // 2. Filters
  const {
    cdn_uri,
    alt_text,
    label,
    position,
    sort_by,
    sort_order,
    page = 1,
    limit = 20,
    search,
  } = props.body;
  const skip = ((page ?? 1) - 1) * (limit ?? 20);
  const take = Math.min(limit ?? 20, 100);

  // 3. Build query
  const where: Record<string, unknown> = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
    ...(cdn_uri && { cdn_uri }),
    ...(alt_text && { alt_text }),
    ...(label && { label }),
    ...(typeof position === "number" && { position }),
  };
  if (search) {
    (where as any).OR = [
      { alt_text: { contains: search } },
      { label: { contains: search } },
    ];
  }

  // 4. Ordering
  let orderBy: Record<string, any> = { position: "asc" };
  if (sort_by) {
    orderBy = { [sort_by]: sort_order || "asc" };
  } else if (sort_order) {
    orderBy = { position: sort_order };
  }

  // 5. Query count and data
  const [total, images] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_images.count({ where }),
    MyGlobal.prisma.shopping_mall_product_images.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
  ]);

  // 6. Compose product, seller, and category resolution
  let productsMap: Record<
    string,
    | Awaited<
        ReturnType<typeof MyGlobal.prisma.shopping_mall_products.findUnique>
      >
    | undefined
  > = {};
  let productSellerMap: Record<
    string,
    | Awaited<
        ReturnType<typeof MyGlobal.prisma.shopping_mall_sellers.findUnique>
      >
    | undefined
  > = {};
  let categoriesMap: Record<string, IShoppingMallProductsCategory.ISummary[]> =
    {};
  const productIds = [
    ...new Set(
      images
        .map((img) => img.shopping_mall_product_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  if (productIds.length > 0) {
    const productsArr = await MyGlobal.prisma.shopping_mall_products.findMany({
      where: { id: { in: productIds } },
    });
    for (const p of productsArr) {
      productsMap[p.id] = p;
    }
    const sellersArr = await MyGlobal.prisma.shopping_mall_sellers.findMany({
      where: {
        id: {
          in: productsArr
            .map((p) => p.shopping_mall_seller_id)
            .filter((id): id is string => typeof id === "string"),
        },
      },
    });
    for (const s of sellersArr) {
      productSellerMap[s.id] = s;
    }
    const catsArr =
      await MyGlobal.prisma.shopping_mall_products_categories.findMany({
        where: { shopping_mall_product_id: { in: productIds } },
      });
    if (catsArr.length > 0) {
      const categoryIds = [
        ...new Set(catsArr.map((rel) => rel.shopping_mall_category_id)),
      ];
      const categories =
        await MyGlobal.prisma.shopping_mall_categories.findMany({
          where: { id: { in: categoryIds } },
        });
      const categoryMap: Record<string, { id: string; name: string }> = {};
      for (const c of categories) {
        categoryMap[c.id] = c;
      }
      for (const pid of productIds) {
        const relevant = catsArr.filter(
          (rel) => rel.shopping_mall_product_id === pid,
        );
        categoriesMap[pid] = relevant
          .map((rel) => {
            const cat = categoryMap[rel.shopping_mall_category_id];
            return cat ? { id: cat.id, name: cat.name } : undefined;
          })
          .filter((x) => !!x) as IShoppingMallProductsCategory.ISummary[];
      }
    }
  }

  // 7. Compose result
  const data = images.map((img): IShoppingMallProductImage.ISummary => {
    let productSummary: IShoppingMallProduct.ISummary | undefined = undefined;
    const prod = img.shopping_mall_product_id
      ? productsMap[img.shopping_mall_product_id]
      : undefined;
    if (prod) {
      const seller = prod.shopping_mall_seller_id
        ? productSellerMap[prod.shopping_mall_seller_id]
        : undefined;
      productSummary = {
        id: prod.id,
        title: prod.title,
        default_price: prod.default_price,
        business_status: prod.business_status,
        seller: seller
          ? {
              id: seller.id,
              business_name: seller.business_name,
            }
          : { id: "", business_name: "" },
        categories: categoriesMap[prod.id] ?? [],
        created_at: toISOStringSafe(prod.created_at),
      };
    }
    let skuSummary: IShoppingMallProductSku.ISummary | undefined = undefined;
    if (img.shopping_mall_product_sku_id) {
      skuSummary = undefined; // Not implemented
    }
    return {
      id: img.id,
      cdn_uri: img.cdn_uri,
      alt_text: img.alt_text ?? undefined,
      position: img.position,
      label: img.label ?? undefined,
      product: productSummary,
      sku: skuSummary,
      created_at: toISOStringSafe(img.created_at),
      updated_at: toISOStringSafe(img.updated_at),
      deleted_at: img.deleted_at ? toISOStringSafe(img.deleted_at) : undefined,
    };
  });

  // 8. Pagination object
  const pagination: IPage.IPagination = {
    current: page ?? 1,
    limit: take,
    records: total,
    pages: Math.ceil(total / take),
  };
  return { pagination, data };
}
