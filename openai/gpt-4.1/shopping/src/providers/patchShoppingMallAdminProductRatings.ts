import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import { IPageIShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductRating";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductRatings(props: {
  admin: AdminPayload;
  body: IShoppingMallProductRating.IRequest;
}): Promise<IPageIShoppingMallProductRating.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    ...(body.shopping_mall_product_rating_id && {
      id: body.shopping_mall_product_rating_id,
    }),
    ...(body.shopping_mall_customer_id && {
      shopping_mall_customer_id: body.shopping_mall_customer_id,
    }),
    ...(body.shopping_mall_customer_session_id && {
      shopping_mall_customer_session_id: body.shopping_mall_customer_session_id,
    }),
    ...(body.shopping_mall_product_id && {
      shopping_mall_product_id: body.shopping_mall_product_id,
    }),
    ...(body.shopping_mall_product_sku_id && {
      shopping_mall_product_sku_id: body.shopping_mall_product_sku_id,
    }),
    ...(body.shopping_mall_order_id && {
      shopping_mall_order_id: body.shopping_mall_order_id,
    }),
    ...(body.shopping_mall_order_item_id && {
      shopping_mall_order_item_id: body.shopping_mall_order_item_id,
    }),
    ...(typeof body.value !== "undefined" && { value: body.value }),
    ...(typeof body.created_at !== "undefined" && {
      created_at: body.created_at,
    }),
    ...(typeof body.updated_at !== "undefined" && {
      updated_at: body.updated_at,
    }),
    ...(() => {
      if (typeof body.deleted_at === "undefined") return {};
      return { deleted_at: body.deleted_at };
    })(),
  };

  let orderBy: Array<{ [key: string]: "asc" | "desc" }> = [
    { created_at: "desc" },
  ];
  if (body.sort_by) {
    orderBy = [{ [body.sort_by]: body.sort_order ?? "desc" }];
  } else if (body.sort_order) {
    orderBy = [{ created_at: body.sort_order }];
  }

  const [total, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_ratings.count({ where }),
    MyGlobal.prisma.shopping_mall_product_ratings.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        customer: true,
        product: {
          include: {
            seller: true,
          },
        },
        productSku: true,
      },
    }),
  ]);

  const data = records.map((rec) => {
    return {
      id: rec.id,
      value: rec.value,
      created_at: toISOStringSafe(rec.created_at),
      updated_at: toISOStringSafe(rec.updated_at),
      deleted_at:
        typeof rec.deleted_at !== "undefined"
          ? rec.deleted_at === null
            ? null
            : toISOStringSafe(rec.deleted_at)
          : undefined,
      customer: rec.customer
        ? {
            id: rec.customer.id,
            name: rec.customer.name,
          }
        : {
            id: rec.shopping_mall_customer_id as string & tags.Format<"uuid">,
            name: "",
          },
      product: rec.product
        ? {
            id: rec.product.id,
            title: rec.product.title,
            default_price: rec.product.default_price,
            business_status: rec.product.business_status,
            seller: rec.product.seller
              ? {
                  id: rec.product.seller.id,
                  business_name: rec.product.seller.business_name,
                }
              : { id: "", business_name: "" },
            categories: [],
            created_at: toISOStringSafe(rec.product.created_at),
          }
        : {
            id: rec.shopping_mall_product_id as string & tags.Format<"uuid">,
            title: "",
            default_price: 0,
            business_status: "",
            seller: { id: "", business_name: "" },
            categories: [],
            created_at: "",
          },
      productSku: rec.productSku
        ? {
            id: rec.productSku.id,
            code: rec.productSku.sku_code,
            product_title: rec.product?.title ?? "",
            option_summary: "",
            in_stock:
              rec.productSku.status === "active" && rec.productSku.stock > 0,
          }
        : {
            id: rec.shopping_mall_product_sku_id as string &
              tags.Format<"uuid">,
            code: "",
            product_title: rec.product?.title ?? "",
            option_summary: "",
            in_stock: false,
          },
    };
  });

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
