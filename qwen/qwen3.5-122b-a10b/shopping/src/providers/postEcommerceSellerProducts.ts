import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductCollector } from "../collectors/EcommerceProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductTransformer } from "../transformers/EcommerceProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSellerProducts(props: {
  seller: SellerPayload;
  body: IEcommerceProduct.ICreate;
}): Promise<IEcommerceProduct> {
  const category = await MyGlobal.prisma.ecommerce_categories.findUnique({
    where: {
      id: props.body.category_id,
      deleted_at: null,
    },
  });
  if (category === null) {
    throw new HttpException("Category not found", 404);
  }
  const record = await MyGlobal.prisma.ecommerce_products.create({
    data: await EcommerceProductCollector.collect({
      body: props.body,
      ecommerceSellers: { id: props.seller.id },
      ecommerceSellerSessions: { id: props.seller.session_id },
    }),
    ...EcommerceProductTransformer.select(),
  } satisfies Prisma.ecommerce_productsCreateArgs);
  return await EcommerceProductTransformer.transform(record);
}
