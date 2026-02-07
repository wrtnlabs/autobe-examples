import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductTransformer } from "../transformers/EcommerceProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceProductsProductId(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProduct.IUpdate;
}): Promise<IEcommerceProduct> {
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: props.productId },
    ...EcommerceProductTransformer.select(),
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  const updates = {
    name: props.body.name,
    description: props.body.description,
    base_price: props.body.base_price,
    updated_at: toISOStringSafe(new Date()),
  };
  const updated = await MyGlobal.prisma.ecommerce_products.update({
    where: { id: props.productId },
    data: updates,
    ...EcommerceProductTransformer.select(),
  });
  await MyGlobal.prisma.ecommerce_product_snapshots.create({
    data: {
      id: v4(),
      product: { connect: { id: props.productId } },
      data: JSON.stringify({
        before: product,
        after: updated,
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });
  return await EcommerceProductTransformer.transform(updated);
}
