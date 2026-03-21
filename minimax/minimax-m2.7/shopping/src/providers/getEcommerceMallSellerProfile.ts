import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallCustomerProfileTransformer } from "../transformers/EcommerceMallCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProfile(props: {
  seller: SellerPayload;
}): Promise<IEcommerceMallCustomerProfile> {
  // Get the seller's associated customer ID from their profile
  const sellerProfile =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirstOrThrow({
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // Query the customer profile using the seller ID from session
  // Sellers may have associated customer accounts for certain operations
  const profile =
    await MyGlobal.prisma.ecommerce_mall_customer_profiles.findUniqueOrThrow({
      where: {
        ecommerce_mall_customer_id: props.seller.id,
      },
      ...EcommerceMallCustomerProfileTransformer.select(),
    });
  return await EcommerceMallCustomerProfileTransformer.transform(profile);
}
