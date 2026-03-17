import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSellerProfileTransformer } from "../transformers/ShoppingMallSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProfilesSellerProfileId(props: {
  sellerProfileId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerProfile> {
  const sellerProfile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findFirstOrThrow({
      where: {
        id: props.sellerProfileId,
        deleted_at: null,
      },
      ...ShoppingMallSellerProfileTransformer.select(),
    });
  return await ShoppingMallSellerProfileTransformer.transform(sellerProfile);
}
