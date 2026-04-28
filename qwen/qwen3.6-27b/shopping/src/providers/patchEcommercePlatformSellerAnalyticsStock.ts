import { IEcommercePlatformStockAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformStockAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformStockAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformStockAnalytic";
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

export async function patchEcommercePlatformSellerAnalyticsStock(props: {
  seller: SellerPayload;
  body: IEcommercePlatformStockAnalytic.IRequest;
}): Promise<IPageIEcommercePlatformStockAnalytic.ISummary> {
  const page =
    typeof props.body.page === "number" && props.body.page >= 1
      ? props.body.page
      : 1;
  const limit =
    typeof props.body.limit === "number" && props.body.limit >= 1
      ? props.body.limit
      : 100;
  const skip = (page - 1) * limit;
  let sellerProfileId: string | undefined = props.body.seller_profile_id;
  if (sellerProfileId === undefined) {
    const profile =
      await MyGlobal.prisma.ecommerce_platform_seller_profiles.findFirst({
        where: {
          seller_id: props.seller.id,
        },
        select: {
          id: true,
        },
      });
    if (profile === null) {
      return {
        data: [],
        pagination: {
          current: page,
          limit,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies IPageIEcommercePlatformStockAnalytic.ISummary;
    }
    sellerProfileId = profile.id;
  }
  const whereInput: Prisma.ecommerce_platform_inventory_recordsWhereInput = {
    productVariant: {
      deleted_at: null,
      product: {
        deleted_at: null,
        ecommerce_platform_seller_profile_id: sellerProfileId,
        ...(props.body.category_id !== undefined && {
          ecommerce_platform_category_id: props.body.category_id,
        }),
        ...(props.body.product_id !== undefined && {
          id: props.body.product_id,
        }),
      },
      ...(props.body.sku_code !== undefined && {
        sku_code: {
          contains: props.body.sku_code,
        },
      }),
    },
  };
  const grouped =
    await MyGlobal.prisma.ecommerce_platform_inventory_records.groupBy({
      by: ["ecommerce_platform_product_variant_id"],
      _sum: {
        quantity_delta: true,
      },
      where: whereInput,
    });
  interface StockRecord {
    variantId: string;
    currentStock: number;
  }
  const stockRecords: StockRecord[] = grouped.map((g) => ({
    variantId: g.ecommerce_platform_product_variant_id,
    currentStock: g._sum.quantity_delta ?? 0,
  }));
  const stockMap = new Map<string, number>(
    stockRecords.map((r) => [r.variantId, r.currentStock]),
  );
  const variantIds = Array.from(stockMap.keys());
  if (variantIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    } satisfies IPageIEcommercePlatformStockAnalytic.ISummary;
  }
  const variants =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findMany({
      where: {
        id: {
          in: variantIds,
        },
      },
      select: {
        id: true,
        sku_code: true,
        price: true,
        created_at: true,
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            sellerProfile: {
              select: {
                id: true,
                shop_name: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  interface VariantStock {
    variant: {
      id: string;
      sku_code: string;
      price: number | null;
      created_at: Date;
      product: {
        id: string;
        name: string;
        base_price: number;
        sellerProfile: {
          id: string;
          shop_name: string;
        };
        category: {
          id: string;
          name: string;
        };
      };
    };
    currentStock: number;
  }
  const filteredVariants: VariantStock[] = variants
    .map((v) => ({
      variant: v,
      currentStock: stockMap.get(v.id) ?? 0,
    }))
    .filter((vs) => {
      const stock = vs.currentStock;
      if (props.body.availability_status === "in_stock" && stock <= 0) {
        return false;
      }
      if (props.body.availability_status === "out_of_stock" && stock > 0) {
        return false;
      }
      if (
        props.body.min_stock_level !== undefined &&
        stock < props.body.min_stock_level
      ) {
        return false;
      }
      if (
        props.body.max_stock_level !== undefined &&
        stock > props.body.max_stock_level
      ) {
        return false;
      }
      return true;
    });
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const direction = sortOrder === "asc" ? 1 : -1;
  filteredVariants.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "current_stock":
        cmp = a.currentStock - b.currentStock;
        break;
      case "sku_code":
        cmp = a.variant.sku_code.localeCompare(b.variant.sku_code);
        break;
      case "product_name":
        cmp = a.variant.product.name.localeCompare(b.variant.product.name);
        break;
      case "shop_name":
        cmp = a.variant.product.sellerProfile.shop_name.localeCompare(
          b.variant.product.sellerProfile.shop_name,
        );
        break;
      case "created_at":
        cmp = a.variant.created_at.getTime() - b.variant.created_at.getTime();
        break;
    }
    return cmp * direction;
  });
  const total = filteredVariants.length;
  const paginated = filteredVariants.slice(skip, skip + limit);
  if (paginated.length === 0 && skip >= total) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    } satisfies IPageIEcommercePlatformStockAnalytic.ISummary;
  }
  const data: IEcommercePlatformStockAnalytic.ISummary[] = paginated.map(
    (item) => {
      const v = item.variant;
      const currentStock = item.currentStock;
      const availabilityStatus = currentStock > 0 ? "in_stock" : "out_of_stock";
      return {
        variantId: v.id as string & tags.Format<"uuid">,
        skuCode: v.sku_code,
        variantPrice: v.price ?? null,
        productId: v.product.id as string & tags.Format<"uuid">,
        productName: v.product.name,
        productBasePrice: v.product.base_price,
        sellerProfileId: v.product.sellerProfile.id as string &
          tags.Format<"uuid">,
        shopName: v.product.sellerProfile.shop_name,
        categoryId: v.product.category.id as string & tags.Format<"uuid">,
        categoryName: v.product.category.name,
        currentStock: Math.round(currentStock) as number & tags.Type<"int32">,
        availabilityStatus,
      } satisfies IEcommercePlatformStockAnalytic.ISummary;
    },
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommercePlatformStockAnalytic.ISummary;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommercePlatformStockAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformStockAnalytic";
// import { IPageIEcommercePlatformStockAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformStockAnalytic";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformSellerAnalyticsStock(props: {
//   seller: SellerPayload;
//   body: IEcommercePlatformStockAnalytic.IRequest;
// }): Promise<IPageIEcommercePlatformStockAnalytic.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------