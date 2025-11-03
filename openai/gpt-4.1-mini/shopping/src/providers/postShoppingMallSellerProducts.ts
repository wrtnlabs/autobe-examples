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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  const { seller, body } = props;

  // Check for duplicate product code
  const existing = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: { code: body.code, deleted_at: null },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException(`Product code '${body.code}' already exists`, 409);
  }

  // Current timestamp
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Generate new UUID
  const newId: string & tags.Format<"uuid"> = v4();

  // Create the product
  const created = await MyGlobal.prisma.shopping_mall_products.create({
    data: {
      id: newId,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      brand: body.brand ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    brand: created.brand ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
