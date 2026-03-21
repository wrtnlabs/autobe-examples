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

export async function putEcommerceMallSellerSellerProfile(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerProfile.IUpdate;
}): Promise<IEcommerceMallSellerProfile> {
  // 1. Fetch current seller profile
  const currentProfile =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirstOrThrow({
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
    });
  // 2. Create snapshot of current state before updating
  await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ecommerce_mall_seller_profile_id: currentProfile.id,
      shop_name: currentProfile.name,
      shop_description: currentProfile.description,
      logo_url: currentProfile.logo_uri,
      created_at: new Date(),
    },
  });
  // 3. Build update data with only provided fields
  const updateData: {
    name?: string;
    description?: string;
    logo_uri?: string | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.logoUri !== undefined) {
    updateData.logo_uri = props.body.logoUri;
  }
  // 4. Update the seller profile
  await MyGlobal.prisma.ecommerce_mall_seller_profiles.update({
    where: { id: currentProfile.id },
    data: updateData,
  });
  // 5. Fetch and return the updated profile
  const updatedProfile =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findUniqueOrThrow({
      where: { id: currentProfile.id },
      ...EcommerceMallSellerProfileTransformer.select(),
    });
  return EcommerceMallSellerProfileTransformer.transform(updatedProfile);
}
