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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceSellerProfileTransformer } from "../transformers/EcommerceSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerProfilesProfileId(props: {
  customer: CustomerPayload;
  profileId: string & tags.Format<"uuid">;
}): Promise<IEcommerceSellerProfile> {
  const record =
    await MyGlobal.prisma.ecommerce_seller_profiles.findFirstOrThrow({
      where: {
        id: props.profileId,
        deleted_at: null,
      },
      ...EcommerceSellerProfileTransformer.select(),
    });
  return await EcommerceSellerProfileTransformer.transform(record);
}
