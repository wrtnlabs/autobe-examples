import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallWishlistCollector } from "../collectors/EcommerceMallWishlistCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallWishlistTransformer } from "../transformers/EcommerceMallWishlistTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlist.ICreate;
}): Promise<IEcommerceMallWishlist> {
  const productId = props.body.ecommerceMallProductId;
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: productId },
  });
  try {
    const created = await MyGlobal.prisma.ecommerce_mall_wishlists.create({
      data: await EcommerceMallWishlistCollector.collect({
        body: props.body,
        ecommerceMallCustomers: { id: props.customer.id },
      }),
      ...EcommerceMallWishlistTransformer.select(),
    });
    return await EcommerceMallWishlistTransformer.transform(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Conflict: Product already in wishlist", 409);
    }
    throw error;
  }
}
