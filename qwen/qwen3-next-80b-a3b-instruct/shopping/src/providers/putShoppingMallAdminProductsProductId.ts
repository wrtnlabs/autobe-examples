import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const existing = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId, deleted_at: null },
  });

  if (!existing) {
    throw new HttpException("Product not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      title: props.body.title,
      description: props.body.description,
      price: props.body.price,
      status: props.body.status,
      shopping_mall_tax_category_id: props.body.shopping_mall_tax_category_id,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return props.productId;
}
