import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminProductVariantsStockStatus(props: {
  admin: AdminPayload;
  body: IEcommerceMallProductVariant.IStockStatusRequest;
}): Promise<IPageIEcommerceMallProductVariant.ISummary> {
  const page = props.body.pageCursor ? parseInt(props.body.pageCursor, 10) : 1;
  const limit = props.body.pageSize ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_product_variantsWhereInput = {
    deleted_at: null,
    ...(props.body.isActive !== undefined && {
      is_active: props.body.isActive,
    }),
    ...(props.body.stockStatus && {
      AND: [
        ...((props.body.stockStatus === "in_stock" && [
          { stock_quantity: { gt: 0 } },
          { is_active: true },
        ]) ||
          []),
        ...((props.body.stockStatus === "low_stock" && [
          { stock_quantity: { gte: 1, lte: 5 } },
          { is_active: true },
        ]) ||
          []),
        ...((props.body.stockStatus === "out_of_stock" && [
          {
            OR: [{ stock_quantity: { equals: 0 } }, { is_active: false }],
          },
        ]) ||
          []),
      ],
    }),
    ...(props.body.minStockQuantity !== undefined && {
      stock_quantity: { gte: props.body.minStockQuantity },
    }),
    ...(props.body.maxStockQuantity !== undefined && {
      stock_quantity: { lte: props.body.maxStockQuantity },
    }),
  } satisfies Prisma.ecommerce_mall_product_variantsWhereInput;
  const orderByInput = (
    props.body.sortOrder === "ASC"
      ? { [props.body.sortBy ?? "stock_quantity"]: "asc" as const }
      : { [props.body.sortBy ?? "stock_quantity"]: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_product_variantsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    include: {
      product: {
        include: {
          seller: true,
          category: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_product_variants.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(data, async (variant) => {
    const displayPrice = variant.price_override ?? variant.product.base_price;
    return {
      id: variant.id as string & tags.Format<"uuid">,
      skuCode: variant.sku_code as string & tags.MaxLength<50>,
      product: {
        id: variant.product.id as string & tags.Format<"uuid">,
        name: variant.product.name as string & tags.MaxLength<500>,
        description: variant.product.description,
        base_price: variant.product.base_price,
        is_active: variant.product.is_active,
        created_at: variant.product.created_at.toISOString() as string &
          tags.Format<"date-time">,
        seller: {
          id: variant.product.seller.id as string & tags.Format<"uuid">,
          email: variant.product.seller.email as string & tags.Format<"email">,
          approval_status: variant.product.seller.approval_status as
            | "pending"
            | "approved"
            | "rejected",
          rejection_reason: variant.product.seller.rejection_reason,
          is_suspended: variant.product.seller.is_suspended,
          is_banned: variant.product.seller.is_banned,
          created_at:
            variant.product.seller.created_at.toISOString() as string &
              tags.Format<"date-time">,
        },
        category: {
          id: variant.product.category.id as string & tags.Format<"uuid">,
          name: variant.product.category.name,
          is_leaf: variant.product.category.is_leaf,
          created_at:
            variant.product.category.created_at.toISOString() as string &
              tags.Format<"date-time">,
          updated_at:
            variant.product.category.updated_at.toISOString() as string &
              tags.Format<"date-time">,
          deleted_at:
            variant.product.category.deleted_at?.toISOString() ?? null,
        },
      } satisfies IEcommerceMallProduct.ISummary,
      stockQuantity: variant.stock_quantity,
      isActive: variant.is_active,
      priceOverride: variant.price_override,
      displayPrice,
    } satisfies IEcommerceMallProductVariant.ISummary;
  });
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  };
}
