import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductCodeSkus(props: {
  seller: SellerPayload;
  productCode: string;
  body: IShoppingMallProductSku.ICreate;
}): Promise<IShoppingMallProductSku> {
  const { seller, productCode, body } = props;

  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: productCode },
  });

  if (!product) {
    throw new HttpException(`Product with code ${productCode} not found`, 404);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_product_skus.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_id: product.id,
      sku_code: body.sku_code,
      price: body.price,
      attributes_json: body.attributes_json ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    sku_code: created.sku_code,
    price: created.price,
    attributes_json: created.attributes_json ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
