import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_product_id: props.productId,
    ...(props.body.search !== undefined
      ? {
          OR: [
            {
              sku_code: {
                contains: props.body.search,
              },
            },
            {
              option_summary: {
                contains: props.body.search,
              },
            },
          ],
        }
      : {}),
    ...(props.body.skuCode !== undefined
      ? {
          sku_code: {
            contains: props.body.skuCode,
          },
        }
      : {}),
    ...(props.body.optionSummary !== undefined
      ? {
          option_summary: {
            contains: props.body.optionSummary,
          },
        }
      : {}),
    ...(props.body.price !== undefined
      ? {
          price: props.body.price,
        }
      : {}),
    ...(props.body.createdAt !== undefined
      ? {
          created_at: new Date(props.body.createdAt),
        }
      : {}),
    ...(props.body.updatedAt !== undefined
      ? {
          updated_at: new Date(props.body.updatedAt),
        }
      : {}),
    ...(props.body.deletedAt === undefined
      ? {}
      : props.body.deletedAt === null
        ? {
            deleted_at: null,
          }
        : {
            deleted_at: new Date(props.body.deletedAt),
          }),
  } satisfies Prisma.shopping_mall_product_variantsWhereInput;
  const orderByInput = (
    props.body.sort === "skuCode"
      ? { sku_code: props.body.direction ?? "asc" }
      : props.body.sort === "optionSummary"
        ? { option_summary: props.body.direction ?? "asc" }
        : props.body.sort === "price"
          ? { price: props.body.direction ?? "asc" }
          : props.body.sort === "updatedAt"
            ? { updated_at: props.body.direction ?? "desc" }
            : props.body.sort === "deletedAt"
              ? { deleted_at: props.body.direction ?? "desc" }
              : { created_at: props.body.direction ?? "desc" }
  ) satisfies Prisma.shopping_mall_product_variantsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_product_variants.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...ShoppingMallProductVariantAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_product_variants.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductVariantAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
