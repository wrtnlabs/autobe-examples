import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceSellerProfileTransformer } from "../transformers/EcommerceSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerProfilesProfileId(props: {
  seller: SellerPayload;
  profileId: string & tags.Format<"uuid">;
}): Promise<IEcommerceSellerProfile> {
  const record =
    await MyGlobal.prisma.ecommerce_seller_profiles.findFirstOrThrow({
      ...EcommerceSellerProfileTransformer.select(),
      where: {
        id: props.profileId,
        deleted_at: null,
        ecommerce_seller_id: props.seller.id,
      },
    });
  return await EcommerceSellerProfileTransformer.transform(record);
}
