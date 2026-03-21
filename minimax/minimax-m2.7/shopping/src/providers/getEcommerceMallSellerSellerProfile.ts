import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerProfileTransformer } from "../transformers/EcommerceMallSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerSellerProfile(props: {
  seller: SellerPayload;
}): Promise<IEcommerceMallSellerProfile> {
  const profile =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirstOrThrow({
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
      ...EcommerceMallSellerProfileTransformer.select(),
    });
  return await EcommerceMallSellerProfileTransformer.transform(profile);
}
