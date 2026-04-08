import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlist";
import { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceWishlistTransformer } from "../transformers/EcommerceWishlistTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<IEcommerceWishlist> {
  const record = await MyGlobal.prisma.ecommerce_wishlists.findUniqueOrThrow({
    where: {
      id: props.wishlistId,
      deleted_at: null,
    },
    ...EcommerceWishlistTransformer.select(),
  });
  if (record.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceWishlistTransformer.transform(record);
}
