import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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

export async function patchShoppingMallSellerOrdersItems(props: {
  seller: SellerPayload;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause for seller ownership
  const where: Prisma.shopping_mall_order_itemsWhereInput = {
    // Filter to only items belonging to products owned by this seller
    order: {
      orderItems: {
        some: {
          productSnapshot: {
            shopping_mall_product_id: {
              equals: props.seller.id,
            },
          },
        },
      },
    },
  };
  // Status filter
  if (props.body.status !== undefined) {
    where.item_status = props.body.status;
  }
  // Date range filter
  if (props.body.date_range !== undefined) {
    const dateRange: Prisma.DateTimeFilter = {};
    if (props.body.date_range.start !== undefined) {
      dateRange.gte = props.body.date_range.start;
    }
    if (props.body.date_range.end !== undefined) {
      dateRange.lte = props.body.date_range.end;
    }
    where.created_at = dateRange;
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        productSnapshot: true,
        variantSnapshot: true,
        sellerProfileSnapshot: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({ where }),
  ]);
  return {
    data: data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      item_status: item.item_status as
        | "paid"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded",
      original_product_name: item.original_product_name,
      original_variant_options: item.original_variant_options,
      created_at: toISOStringSafe(item.created_at),
      productSnapshot: {
        id: item.productSnapshot.id as string & tags.Format<"uuid">,
        name: item.productSnapshot.name,
        description: item.productSnapshot.description,
        base_price: item.productSnapshot.base_price,
        category: {
          id: item.productSnapshot.shopping_mall_category_id as string &
            tags.Format<"uuid">,
          name: item.productSnapshot.name,
          description: item.productSnapshot.description,
          parent: null,
          subcategory_count: 0,
        },
        product: {
          id: item.productSnapshot.shopping_mall_product_id as string &
            tags.Format<"uuid">,
          name: item.productSnapshot.name,
          base_price: item.productSnapshot.base_price,
          is_deleted: item.productSnapshot.is_deleted,
          seller: {
            id: props.seller.id as string & tags.Format<"uuid">,
            shop_name: "",
            approval_status: "pending",
            created_at: toISOStringSafe(new Date()),
          },
          category: {
            id: item.productSnapshot.shopping_mall_category_id as string &
              tags.Format<"uuid">,
            name: item.productSnapshot.name,
            description: item.productSnapshot.description,
            parent: null,
            subcategory_count: 0,
          },
          average_rating: 0,
        },
      },
      variantSnapshot: {
        id: item.variantSnapshot.id as string & tags.Format<"uuid">,
        product_snapshot_id: item.variantSnapshot
          .product_snapshot_id as string & tags.Format<"uuid">,
        sku_code: item.variantSnapshot.sku_code,
        variant_price_override:
          item.variantSnapshot.variant_price_override ?? null,
        stock_quantity: item.variantSnapshot.stock_quantity,
        is_in_stock: item.variantSnapshot.is_in_stock,
      },
      sellerProfileSnapshot: {
        id: item.sellerProfileSnapshot.id as string & tags.Format<"uuid">,
        shop_name: item.sellerProfileSnapshot.shop_name,
        logo_image_url: item.sellerProfileSnapshot.logo_image_url ?? null,
        approval_status: item.sellerProfileSnapshot.approval_status,
      },
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
