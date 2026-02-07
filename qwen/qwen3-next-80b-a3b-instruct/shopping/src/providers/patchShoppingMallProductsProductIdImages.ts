import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdImages(props: {
  productId: string;
  body: IShoppingMallProductImage.IRequest;
}): Promise<IShoppingMallProductImage> {
  // Validate product existence and that it's not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) throw new HttpException("Product not found", 404);
  if (product.deleted_at) throw new HttpException("Product not found", 404);
  // Since IRequest is an empty object ({}), no body properties are expected
  // But business logic requires image IDs for reordering
  // This is a schema-logic mismatch
  throw new HttpException(
    "Schema definition error: IRequest interface is empty but operation requires image IDs for reordering. Contact API team to update IShoppingMallProductImage.IRequest.",
    500,
  );
}
