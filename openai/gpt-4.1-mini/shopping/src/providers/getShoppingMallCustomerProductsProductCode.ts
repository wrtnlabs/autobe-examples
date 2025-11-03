import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerProductsProductCode(props: {
  customer: CustomerPayload;
  productCode: string;
}): Promise<IShoppingMallProduct> {
  const { productCode } = props;

  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      code: productCode,
      deleted_at: null,
    },
    include: {
      shopping_mall_product_skus: true,
      shopping_mall_product_approvals: true,
    },
  });

  if (!product) {
    throw new HttpException(`Product with code ${productCode} not found`, 404);
  }

  return {
    id: product.id,
    code: product.code,
    name: product.name,
    description: product.description ?? null,
    brand: product.brand ?? null,
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
    deleted_at: product.deleted_at ? toISOStringSafe(product.deleted_at) : null,
    shopping_mall_product_skus: product.shopping_mall_product_skus?.map(
      (sku) => ({
        id: sku.id,
        shopping_mall_product_id: sku.shopping_mall_product_id,
        sku_code: sku.sku_code,
        price: sku.price,
        attributes_json: sku.attributes_json ?? null,
        created_at: toISOStringSafe(sku.created_at),
        updated_at: toISOStringSafe(sku.updated_at),
        deleted_at: sku.deleted_at ? toISOStringSafe(sku.deleted_at) : null,
      }),
    ),
    shopping_mall_product_approvals:
      product.shopping_mall_product_approvals?.map((approval) => ({
        id: approval.id,
        shopping_mall_product_id: approval.shopping_mall_product_id,
        shopping_mall_admin_id: approval.shopping_mall_admin_id,
        status: approval.status,
        reason: approval.reason ?? null,
        created_at: toISOStringSafe(approval.created_at),
        updated_at: toISOStringSafe(approval.updated_at),
      })),
  };
}
