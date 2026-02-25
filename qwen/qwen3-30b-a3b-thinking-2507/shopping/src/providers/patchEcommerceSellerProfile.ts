import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceCustomerProfileTransformer } from "../transformers/EcommerceCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerProfile(props: {
  seller: SellerPayload;
  body: IEcommerceCustomerProfile.IUpdate;
}): Promise<IEcommerceCustomerProfile> {
  const existing =
    await MyGlobal.prisma.ecommerce_customer_profiles.findUniqueOrThrow({
      where: { ecommerce_customer_id: props.seller.id },
    });
  await MyGlobal.prisma.ecommerce_customer_profile_snapshots.create({
    data: {
      id: v4(),
      ecommerce_customer_profile_id: existing.id,
      display_name: existing.display_name,
      phone_number: existing.phone_number,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  const updateData: any = {
    customer: {
      id: props.seller.id,
    },
    snapshots: [],
  };
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name;
  }
  if (props.body.phone_number !== undefined) {
    updateData.phone_number = props.body.phone_number;
  }
  updateData.updated_at = new Date();
  const updated = await MyGlobal.prisma.ecommerce_customer_profiles.update({
    where: { id: existing.id },
    data: updateData,
  });
  return await EcommerceCustomerProfileTransformer.transform(updated);
}
