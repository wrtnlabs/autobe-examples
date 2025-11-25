import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import { IPageIShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttributeValue";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSkusSkuIdAttributeValues(props: {
  seller: SellerPayload;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttributeValue.IRequest;
}): Promise<IPageIShoppingMallProductAttributeValue.ISummary> {
  const { seller, skuId, body } = props;
  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Confirm SKU ownership (and fetch .sku data for mapping in output)
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: skuId },
    include: { product: { include: { seller: true } } },
  });
  if (!sku || sku.product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException("SKU not found or permission denied", 404);
  }

  const whereCondition = {
    shopping_mall_product_sku_id: skuId,
    ...(body.attribute_id !== undefined
      ? { shopping_mall_product_attribute_id: body.attribute_id }
      : {}),
    ...(body.value_display_name !== undefined
      ? { value_display_name: { contains: body.value_display_name } }
      : {}),
  };

  // Fetch attribute values with joined attribute (and its product for minimal ISummary)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_attribute_values.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        attribute: {
          include: { product: { include: { seller: true } } },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_product_attribute_values.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      sku: {
        id: sku.id,
        code: sku.sku_code,
        product_title: sku.product.title,
        option_summary: "",
        in_stock: sku.stock > 0,
      },
      attribute: {
        id: row.attribute.id,
        product: {
          id: row.attribute.product.id,
          title: row.attribute.product.title,
          default_price: row.attribute.product.default_price,
          business_status: row.attribute.product.business_status,
          seller: {
            id: row.attribute.product.seller.id,
            business_name: row.attribute.product.seller.business_name,
          },
          categories: [],
          created_at: toISOStringSafe(row.attribute.product.created_at),
        },
        attribute_name: row.attribute.attribute_name,
        position: row.attribute.position,
        created_at: toISOStringSafe(row.attribute.created_at),
        updated_at: toISOStringSafe(row.attribute.updated_at),
        deleted_at:
          row.attribute.deleted_at === null ||
          row.attribute.deleted_at === undefined
            ? undefined
            : toISOStringSafe(row.attribute.deleted_at),
      },
      value_display_name: row.value_display_name,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
