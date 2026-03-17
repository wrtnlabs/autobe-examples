import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallCustomerProfileTransformer } from "../transformers/ShoppingMallCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProfile(props: {
  seller: SellerPayload;
  body: IShoppingMallCustomerProfile.IUpdate;
}): Promise<IShoppingMallCustomerProfile> {
  const profile =
    await MyGlobal.prisma.shopping_mall_customer_profiles.findUniqueOrThrow({
      where: {
        shopping_mall_customer_id: props.seller.id,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (profile.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_customer_profiles.update({
    where: {
      id: profile.id,
    },
    data: {
      ...(props.body.displayName !== undefined
        ? {
            display_name: props.body.displayName,
          }
        : {}),
      ...(props.body.phoneNumber !== undefined
        ? {
            phone_number: props.body.phoneNumber,
          }
        : {}),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_customer_profiles.findUniqueOrThrow({
      where: {
        id: profile.id,
      },
      ...ShoppingMallCustomerProfileTransformer.select(),
    });
  return await ShoppingMallCustomerProfileTransformer.transform(updated);
}
