import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceWishlistItemCollector } from "../collectors/EcommerceWishlistItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceWishlistItemTransformer } from "../transformers/EcommerceWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerWishlistItems(props: {
  customer: CustomerPayload;
  body: IEcommerceWishlistItem.ICreate;
}): Promise<IEcommerceWishlistItem> {
  const productVariant =
    await MyGlobal.prisma.ecommerce_product_variants.findUniqueOrThrow({
      where: { id: props.body.productVariantId },
      select: { price: true },
    });
  const created = await MyGlobal.prisma.ecommerce_wishlist_items.create({
    data: await EcommerceWishlistItemCollector.collect({
      body: props.body,
      ecommerceCustomers: { id: props.customer.id },
    }),
    ...EcommerceWishlistItemTransformer.select(),
  });
  return await EcommerceWishlistItemTransformer.transform(created);
}
