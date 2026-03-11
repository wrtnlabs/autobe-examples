import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IShoppingMallSeller.IUpdate;
}): Promise<IShoppingMallSeller> {
  // Find seller by customer ID and validate status
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: props.customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
      approval_status: true,
      suspended: true,
      banned: true,
    },
  });
  // Validate seller can update profile
  if (seller.approval_status !== "approved") {
    throw new HttpException("Seller is not approved", 403);
  }
  if (seller.suspended) {
    throw new HttpException("Seller account is suspended", 403);
  }
  if (seller.banned) {
    throw new HttpException("Seller account is banned", 403);
  }
  // Update seller profile
  const updated = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.customer.id },
    data: {
      shop_name: props.body.shop_name,
      shop_description: props.body.shop_description ?? null,
      logo_image: props.body.logo_image ?? null,
      updated_at: new Date(),
    },
    ...ShoppingMallSellerTransformer.select(),
  });
  return await ShoppingMallSellerTransformer.transform(updated);
}
